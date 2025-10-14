// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users with filters and pagination
router.get('/', verifyToken, requireRole('admin', 'instructor'), async (req, res) => {
    try {
        const {
            role,
            search,
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        let query = supabase
            .from('users')
            .select('id, email, full_name, role, created_at', { count: 'exact' });

        // Filter by role
        if (role && role !== 'all') {
            query = query.eq('role', role);
        }

        // Search by name or email
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        // Sorting
        const ascending = sortOrder === 'asc';
        query = query.order(sortBy, { ascending });

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: users, error, count } = await query;

        if (error) throw error;

        // Remove password_hash from response
        const sanitizedUsers = users.map(user => {
            const { password_hash, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.json({
            users: sanitizedUsers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch users' } });
    }
});

// Get single user
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Users can view their own profile, admins can view anyone
        if (req.user.id !== id && req.user.role !== 'admin') {
            return res.status(403).json({ error: { message: 'Not authorized' } });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch user' } });
    }
});

// Update user
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, role, password, age, guardian_name, guardian_contact, specialization } = req.body;

        // Check authorization
        if (req.user.id !== id && req.user.role !== 'admin') {
            return res.status(403).json({ error: { message: 'Not authorized' } });
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', id)
            .single();

        if (!existingUser) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        // Only admin can change roles
        if (role && role !== existingUser.role && req.user.role !== 'admin') {
            return res.status(403).json({ error: { message: 'Cannot change role' } });
        }

        const updateData = {};
        if (full_name) updateData.full_name = full_name;
        if (email) updateData.email = email;
        if (role && req.user.role === 'admin') updateData.role = role;
        if (age !== undefined) updateData.age = age;
        if (guardian_name !== undefined) updateData.guardian_name = guardian_name;
        if (guardian_contact !== undefined) updateData.guardian_contact = guardian_contact;
        if (specialization !== undefined) updateData.specialization = specialization;

        // Hash password if provided
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, email, full_name, role, created_at')
            .single();

        if (error) throw error;

        res.json({
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: { message: 'Failed to update user' } });
    }
});

// Delete user (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (req.user.id === id) {
            return res.status(400).json({ error: { message: 'Cannot delete your own account' } });
        }

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!existingUser) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        // Delete user (cascade deletes will handle related records)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: { message: 'Failed to delete user' } });
    }
});

// Get user statistics (for profile)
router.get('/:id/stats', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check authorization
        if (req.user.id !== id && req.user.role !== 'admin') {
            return res.status(403).json({ error: { message: 'Not authorized' } });
        }

        // Get user's role
        const { data: user } = await supabase
            .from('users')
            .select('role')
            .eq('id', id)
            .single();

        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        let stats = {};

        if (user.role === 'student') {
            // Student stats
            const { data: enrollments, count: enrollmentCount } = await supabase
                .from('enrollments')
                .select('id', { count: 'exact' })
                .eq('user_id', id);

            const { data: progress } = await supabase
                .from('lesson_progress')
                .select('completed, time_spent')
                .eq('user_id', id);

            const completedLessons = progress?.filter(p => p.completed).length || 0;
            const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.time_spent || 0), 0) || 0;

            stats = {
                enrolled_courses: enrollmentCount || 0,
                completed_lessons: completedLessons,
                total_time_spent: totalTimeSpent
            };
        } else if (user.role === 'instructor') {
            // Instructor stats
            const { data: courses, count: courseCount } = await supabase
                .from('courses')
                .select('id', { count: 'exact' })
                .eq('instructor_id', id);

            const { data: enrollments, count: studentCount } = await supabase
                .from('enrollments')
                .select('user_id', { count: 'exact' })
                .in('course_id', courses?.map(c => c.id) || []);

            stats = {
                total_courses: courseCount || 0,
                total_students: studentCount || 0
            };
        }

        res.json({ stats });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch user stats' } });
    }
});

module.exports = router;