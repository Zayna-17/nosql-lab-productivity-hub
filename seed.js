const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'productivity_hub';

async function seed() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('projects').deleteMany({});
    await db.collection('tasks').deleteMany({});
    await db.collection('notes').deleteMany({});
    
    console.log('Cleared existing collections');
    
    // Create users (2 users)
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('password456', 10);
    
    const users = await db.collection('users').insertMany([
      {
        email: 'alex@example.com',
        passwordHash: hashedPassword1,
        name: 'Alex Johnson',
        createdAt: new Date()
      },
      {
        email: 'jamie@example.com', 
        passwordHash: hashedPassword2,
        name: 'Jamie Smith',
        createdAt: new Date()
      }
    ]);
    
    const ownerId = users.insertedIds[0];
    console.log('✓ Created 2 users');
    
    // Create projects (4 projects)
    const projects = await db.collection('projects').insertMany([
      { ownerId: ownerId, name: 'Website Redesign', description: 'Complete company website overhaul', archived: false, createdAt: new Date() },
      { ownerId: ownerId, name: 'Mobile App Development', description: 'iOS and Android development', archived: false, createdAt: new Date() },
      { ownerId: ownerId, name: 'Marketing Campaign Q2', description: 'Q2 marketing push', archived: true, createdAt: new Date() },
      { ownerId: ownerId, name: 'Database Migration', description: 'Move to cloud infrastructure', archived: false, createdAt: new Date() }
    ]);
    
    const projectIds = projects.insertedIds;
    console.log('✓ Created 4 projects');
    
    // Create tasks (with embedded subtasks and tags)
    await db.collection('tasks').insertMany([
      {
        ownerId: ownerId,
        projectId: projectIds[0],
        title: 'Design homepage mockup',
        status: 'done',
        priority: 1,
        subtasks: [
          { title: 'Create wireframe', done: true },
          { title: 'Get client approval', done: true }
        ],
        tags: ['design', 'frontend', 'urgent'],
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[0],
        title: 'Implement responsive layout',
        status: 'in-progress',
        priority: 2,
        subtasks: [
          { title: 'Mobile view', done: true },
          { title: 'Tablet view', done: false },
          { title: 'Desktop view', done: false }
        ],
        tags: ['css', 'responsive', 'frontend'],
        dueDate: new Date('2026-05-15'),
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[0],
        title: 'Setup analytics tracking',
        status: 'todo',
        priority: 3,
        subtasks: [],
        tags: ['analytics', 'tracking'],
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[1],
        title: 'Setup React Native environment',
        status: 'todo',
        priority: 1,
        subtasks: [
          { title: 'Install dependencies', done: false },
          { title: 'Configure build tools', done: false }
        ],
        tags: ['mobile', 'react', 'setup'],
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[1],
        title: 'Design app icon and splash screen',
        status: 'done',
        priority: 2,
        subtasks: [],
        tags: ['design', 'graphics', 'mobile'],
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[2],
        title: 'Create social media content',
        status: 'in-progress',
        priority: 1,
        subtasks: [
          { title: 'Design graphics', done: true },
          { title: 'Write copy', done: false }
        ],
        tags: ['marketing', 'social'],
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[3],
        title: 'Backup current database',
        status: 'done',
        priority: 1,
        subtasks: [{ title: 'Verify backup integrity', done: true }],
        tags: ['database', 'backup'],
        createdAt: new Date()
      },
      {
        ownerId: ownerId,
        projectId: projectIds[3],
        title: 'Test migration script on staging',
        status: 'in-progress',
        priority: 2,
        subtasks: [
          { title: 'Run test migration', done: false },
          { title: 'Validate data integrity', done: false }
        ],
        tags: ['migration', 'testing'],
        createdAt: new Date()
      }
    ]);
    
    console.log('✓ Created 8 tasks with embedded subtasks and tags');
    
    // Create notes
// Create notes (with correct title and body fields)
await db.collection('notes').insertMany([
  { 
    ownerId: ownerId, 
    projectId: projectIds[0], 
    title: 'Design Color Scheme',
    body: 'Remember to use the new color scheme (#4A90E2)', 
    tags: ['design', 'branding'], 
    createdAt: new Date() 
  },
  { 
    ownerId: ownerId, 
    projectId: projectIds[0], 
    title: 'Client Meeting',
    body: 'Schedule client review meeting for Friday', 
    tags: ['meeting', 'client'], 
    createdAt: new Date() 
  },
  { 
    ownerId: ownerId, 
    projectId: projectIds[1], 
    title: 'Push Notification Research',
    body: 'Research push notification services (Firebase vs OneSignal)', 
    tags: ['research', 'mobile'], 
    createdAt: new Date() 
  },
  { 
    ownerId: ownerId, 
    projectId: projectIds[2], 
    title: 'Facebook Ads',
    body: 'Facebook ad campaign needs approval', 
    tags: ['ads', 'social'], 
    createdAt: new Date() 
  },
  { 
    ownerId: ownerId, 
    title: 'Feature Idea',
    body: 'Add dark mode to all apps', 
    tags: ['brainstorm', 'feature'], 
    projectId: null, 
    createdAt: new Date() 
  },
  { 
    ownerId: ownerId, 
    title: 'Q2 Planning Notes',
    body: 'Team meeting notes - Focus on performance optimization', 
    tags: ['meeting', 'planning'], 
    projectId: null, 
    pinned: true,  // Schema flexibility example - only this note has pinned
    createdAt: new Date() 
  },
  { 
    ownerId: ownerId, 
    title: 'Competitor Research',
    body: 'Research competitor features for Q3 roadmap', 
    tags: ['research', 'planning'], 
    projectId: null, 
    createdAt: new Date() 
  }
]);
    
    console.log('✓ Created 7 notes');
    
    console.log('\n✅ Seeding completed successfully!');
    console.log(`📊 Summary: 2 users, 4 projects, 8 tasks, 7 notes`);
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await client.close();
  }
}

seed();