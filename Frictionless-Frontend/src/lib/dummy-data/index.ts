import { dummyStartups } from './startups';
import { dummyInvestors } from './investors';
import { dummyMatches } from './matches';
import { dummyTaskGroups } from './tasks';
import { dummyAssessmentRuns } from './assessments';
import { dummyDocuments } from './documents';
import { dummyChatThreads, dummyChatMessages } from './chat-messages';
import { dummyPrograms } from './programs';
import { dummyActivities } from './activity';
import { dummyNotifications } from './notifications';

export const dummyData = {
  startups: dummyStartups,
  investors: dummyInvestors,
  matches: dummyMatches,
  taskGroups: dummyTaskGroups,
  assessmentRuns: dummyAssessmentRuns,
  documents: dummyDocuments,
  chatThreads: dummyChatThreads,
  chatMessages: dummyChatMessages,
  programs: dummyPrograms,
  activities: dummyActivities,
  notifications: dummyNotifications,
};

// Re-export individual modules for granular imports
export { dummyStartups, type DummyStartup } from './startups';
export { dummyInvestors, type DummyInvestor } from './investors';
export { dummyMatches, type DummyMatch } from './matches';
export { dummyTaskGroups, type DummyTask, type DummyTaskGroup } from './tasks';
export { dummyAssessmentRuns, type DummyAssessmentRun, type DummyAssessmentCategory } from './assessments';
export { dummyDocuments, type DummyDocument, type DummyDocumentCategory, type DummyValidationStatus } from './documents';
export { dummyChatThreads, dummyChatMessages, type DummyChatThread, type DummyChatMessage } from './chat-messages';
export { dummyPrograms, type DummyProgram, type DummyProgramStage } from './programs';
export { dummyActivities, type DummyActivityEvent } from './activity';
export { dummyNotifications, type DummyNotification } from './notifications';
