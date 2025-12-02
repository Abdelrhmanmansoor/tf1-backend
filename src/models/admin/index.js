const AgeGroup = require('./AgeGroup');
const AdminTrainingSession = require('./AdminTrainingSession');
const Match = require('./Match');
const Program = require('./Program');
const CoachEvaluation = require('./CoachEvaluation');
const KPI = require('./KPI');
const Initiative = require('./Initiative');
const Partnership = require('./Partnership');
const Announcement = require('./Announcement');
const Meeting = require('./Meeting');
const Document = require('./Document');
const Task = require('./Task');
const Alert = require('./Alert');
const LeaderTeam = require('./LeaderTeam');
const AuditLog = require('./AuditLog');
const Permission = require('./Permission');

module.exports = {
  AgeGroup,
  AdminTrainingSession,
  TrainingSession: AdminTrainingSession,
  Match,
  Program,
  CoachEvaluation,
  KPI,
  Initiative,
  Partnership,
  Announcement,
  Meeting,
  Document,
  Task,
  Alert,
  LeaderTeam,
  AuditLog,
  Permission
};
