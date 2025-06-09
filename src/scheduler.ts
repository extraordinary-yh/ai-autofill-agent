
import "dotenv-defaults/config"; // Keep this to load the .env file
import cron from 'node-cron';
import { main } from './main';

console.log('Scheduler process started.');
console.log('Workflow is scheduled to run every 5 minutes. This process will keep running.');

const scheduledWorkflowData = {
  firstName: 'Scheduled',
  lastName: 'Process',
  dateOfBirth: '2000-01-01',
  medicalId: 'SCHED999',
  gender: 'Other',
  bloodType: 'O+',
  allergies: 'None',
  currentMedications: 'None',
  emergencyContactName: 'Scheduler Contact',
  emergencyContactPhone: '555-0199'
};

// I've set the schedule back to every 5 minutes
cron.schedule('*/20 * * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled workflow...`);
  try {
    await main(scheduledWorkflowData);
    console.log(`[${new Date().toISOString()}] Scheduled workflow completed successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] An error occurred during the scheduled workflow:`, error);
  }
});