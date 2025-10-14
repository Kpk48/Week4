// routes/analytics.js
const express = require('express');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get platform analytics (admin only)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        // Get total counts
        const { count: totalStudents } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'student');

        const { count: totalTeachers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'instructor');

        const { count: totalCourses } = await supabase
            .from('courses')
            .select('id', { count: 'exact', head: true });

        const { count: totalEnrollments } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true });

        // Get completion stats
        const { data: allProgress } = await supabase
            .from('lesson_progress')
            .select('completed');

        const completedCount = allProgress?.filter(p => p.completed).length || 0;
        const avgCompletion = allProgress?.length > 0
            ? Math.round((completedCount / allProgress.length) * 100)
            : 0;

        // Get students by age group
        const { data: students } = await supabase
            .from('users')
            .select('age')
            .eq('role', 'student')
            .not('age', 'is', null);

        const ageGroups = {
            '18-22': 0,
            '23-27': 0,
            '28-32': 0,
            '33+': 0
        };

        students?.forEach(student => {
            const age = student.age;
            if (age >= 18 && age <= 22) ageGroups['18-22']++;
            else if (age >= 23 && age <= 27) ageGroups['23-27']++;
            else if (age >= 28 && age <= 32) ageGroups['28-32']++;
            else if (age >= 33) ageGroups['33+']++;
        });

        const studentsByAge = Object.entries(ageGroups).map(([age, count]) => ({
            age,
            count
        }));

        // Get students per teacher
        const { data: courses } = await supabase
            .from('courses')
            .select(`
                instructor_id,
                instructor:users!courses_instructor_id_fkey(full_name),
                enrollments(count)
            `);

        const teacherMap = new Map();

        courses?.forEach(course => {
            const instructorId = course.instructor_id;
            const instructorName = course.instructor?.full_name || 'Unknown';
            const studentCount = course.enrollments?.[0]?.count || 0;

            if (!teacherMap.has(instructorId)) {
                teacherMap.set(instructorId, {
                    name: instructorName,
                    students: 0
                });
            }
            teacherMap.get(instructorId).students += studentCount;
        });

        const studentsByTeacher = Array.from(teacherMap.values())
            .filter(t => t.students > 0)
            .sort((a, b) => b.students - a.students)
            .slice(0, 5); // Top 5 teachers

        // Get recent students (last 10 enrollments)
        const { data: recentEnrollments } = await supabase
            .from('enrollments')
            .select(`
                enrolled_at,
                user:users(id, full_name, email)
            `)
            .order('enrolled_at', { ascending: false })
            .limit(10);

        // Remove duplicates (same student enrolled in multiple courses)
        const seenStudents = new Set();
        const recentStudents = [];

        recentEnrollments?.forEach(enrollment => {
            if (enrollment.user && !seenStudents.has(enrollment.user.id)) {
                seenStudents.add(enrollment.user.id);
                recentStudents.push({
                    id: enrollment.user.id,
                    name: enrollment.user.full_name,
                    email: enrollment.user.email,
                    enrolled: enrollment.enrolled_at
                });
            }
        });

        // Get enrollment trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentEnrollmentData } = await supabase
            .from('enrollments')
            .select('enrolled_at')
            .gte('enrolled_at', thirtyDaysAgo.toISOString());

        // Group by day
        const enrollmentsByDay = {};
        recentEnrollmentData?.forEach(enrollment => {
            const date = new Date(enrollment.enrolled_at).toISOString().split('T')[0];
            enrollmentsByDay[date] = (enrollmentsByDay[date] || 0) + 1;
        });

        const enrollmentTrend = Object.entries(enrollmentsByDay)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Get course categories distribution
        const { data: coursesData } = await supabase
            .from('courses')
            .select('category');

        const categoryMap = {};
        coursesData?.forEach(course => {
            const category = course.category || 'Uncategorized';
            categoryMap[category] = (categoryMap[category] || 0) + 1;
        });

        const coursesByCategory = Object.entries(categoryMap).map(([category, count]) => ({
            category,
            count
        }));

        // Calculate growth rates (compare with previous period)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: previousEnrollments } = await supabase
            .from('enrollments')
            .select('enrolled_at')
            .gte('enrolled_at', sixtyDaysAgo.toISOString())
            .lt('enrolled_at', thirtyDaysAgo.toISOString());

        const currentPeriodEnrollments = recentEnrollmentData?.length || 0;
        const previousPeriodEnrollments = previousEnrollments?.length || 1; // Avoid division by zero

        const enrollmentGrowth = Math.round(
            ((currentPeriodEnrollments - previousPeriodEnrollments) / previousPeriodEnrollments) * 100
        );

        res.json({
            totalStudents: totalStudents || 0,
            totalTeachers: totalTeachers || 0,
            totalCourses: totalCourses || 0,
            totalEnrollments: totalEnrollments || 0,
            avgCompletion,
            enrollmentGrowth,
            studentsByAge,
            studentsByTeacher,
            recentStudents: recentStudents.slice(0, 5), // Top 5 recent
            enrollmentTrend,
            coursesByCategory
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch analytics' } });
    }
});

// Get instructor-specific analytics
router.get('/instructor/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check authorization
        if (req.user.id !== id && req.user.role !== 'admin') {
            return res.status(403).json({ error: { message: 'Not authorized' } });
        }

        // Get instructor's courses
        const { data: courses } = await supabase
            .from('courses')
            .select(`
                id,
                title,
                enrollments(count),
                lessons(id)
            `)
            .eq('instructor_id', id);

        const courseStats = courses?.map(course => ({
            id: course.id,
            title: course.title,
            students: course.enrollments?.[0]?.count || 0,
            lessons: course.lessons?.length || 0
        })) || [];

        const totalStudents = courseStats.reduce((sum, course) => sum + course.students, 0);
        const totalCourses = courses?.length || 0;

        // Get completion rate for instructor's courses
        const courseIds = courses?.map(c => c.id) || [];

        const { data: progress } = await supabase
            .from('lesson_progress')
            .select('completed, lesson:lessons!inner(course_id)')
            .in('lesson.course_id', courseIds);

        const completedCount = progress?.filter(p => p.completed).length || 0;
        const avgCompletionRate = progress?.length > 0
            ? Math.round((completedCount / progress.length) * 100)
            : 0;

        res.json({
            totalCourses,
            totalStudents,
            avgCompletionRate,
            courseStats
        });
    } catch (error) {
        console.error('Get instructor analytics error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch instructor analytics' } });
    }
});

module.exports = router;