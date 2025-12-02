const express = require('express');
const router = express.Router();
const controller = require('../controllers/secretaryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin', 'administrator', 'secretary', 'executive-director', 'club'));

router.get('/dashboard', controller.getDashboard);

router.get('/calendar', controller.getCalendar);

router.get('/calendar/meetings', controller.getMeetings);
router.post('/calendar/meetings', controller.createMeeting);
router.get('/calendar/meetings/:id', controller.getMeeting);
router.patch('/calendar/meetings/:id', controller.updateMeeting);
router.delete('/calendar/meetings/:id', controller.deleteMeeting);
router.post('/calendar/meetings/:id/invite', controller.sendMeetingInvite);

router.get('/documents', controller.getDocuments);
router.post('/documents', controller.createDocument);
router.get('/documents/:id', controller.getDocument);
router.patch('/documents/:id', controller.updateDocument);
router.delete('/documents/:id', controller.deleteDocument);
router.post('/documents/:id/submit', controller.submitDocument);
router.post('/documents/:id/approve', controller.approveDocument);
router.post('/documents/:id/reject', controller.rejectDocument);

router.get('/messages', controller.getMessages);
router.post('/messages', controller.createMessage);
router.get('/messages/:id', controller.getMessage);
router.patch('/messages/:id/read', controller.markMessageRead);
router.delete('/messages/:id', controller.deleteMessage);

router.get('/tasks', controller.getTasks);
router.post('/tasks', controller.createTask);
router.patch('/tasks/:id', controller.updateTask);
router.delete('/tasks/:id', controller.deleteTask);

module.exports = router;
