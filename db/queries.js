// db/queries.js
//
// =============================================================================
//  THIS IS THE FILE YOU EDIT.
// =============================================================================

const { ObjectId } = require('mongodb');

/**
 * Query 1: signupUser
 * -------------------------------------------------------------
 * Insert a new user document. Email must be globally unique
 */
async function signupUser(db, userData) {
  const { email, passwordHash, name } = userData;
  
  // Insert new user with createdAt
  const result = await db.collection('users').insertOne({
    email,
    passwordHash,
    name,
    createdAt: new Date()
  });
  
  return { insertedId: result.insertedId };
}

/**
 * Query 2: loginFindUser
 * -------------------------------------------------------------
 * Find a user by email so the route can compare passwords.
 */
async function loginFindUser(db, email) {
  const user = await db.collection('users').findOne({ email });
  return user;
}

/**
 * Query 3: listUserProjects
 * -------------------------------------------------------------
 * List all NON-archived projects belonging to one user, newest first.
 */
async function listUserProjects(db, ownerId) {
  const projects = await db.collection('projects')
    .find({ ownerId: ownerId, archived: false })
    .sort({ createdAt: -1 })
    .toArray();
  return projects;
}

/**
 * Query 4: createProject
 * -------------------------------------------------------------
 * Insert a new project for a user.
 */
async function createProject(db, projectData) {
  const { ownerId, name, description = '' } = projectData;
  
  const result = await db.collection('projects').insertOne({
    ownerId,
    name,
    description,
    archived: false,
    createdAt: new Date()
  });
  
  return { insertedId: result.insertedId };
}

/**
 * Query 5: archiveProject
 * -------------------------------------------------------------
 * Mark a project as archived (do not delete).
 */
async function archiveProject(db, projectId) {
  const result = await db.collection('projects').updateOne(
    { _id: new ObjectId(projectId) },
    { $set: { archived: true } }
  );
  
  return { 
    matchedCount: result.matchedCount, 
    modifiedCount: result.modifiedCount 
  };
}

/**
 * Query 6: listProjectTasks
 * -------------------------------------------------------------
 * List tasks for one project, with an optional status filter.
 */
async function listProjectTasks(db, projectId, status) {
  // Build filter dynamically
  const filter = { projectId: new ObjectId(projectId) };
  if (status) {
    filter.status = status;
  }
  
  const tasks = await db.collection('tasks')
    .find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .toArray();
  
  return tasks;
}

/**
 * Query 7: createTask
 * -------------------------------------------------------------
 * Insert a new task with embedded subtasks and tags array.
 */
async function createTask(db, taskData) {
  const { 
    ownerId, 
    projectId, 
    title, 
    priority = 1, 
    tags = [], 
    subtasks = [] 
  } = taskData;
  
  const result = await db.collection('tasks').insertOne({
    ownerId,
    projectId: new ObjectId(projectId),
    title,
    priority,
    tags,
    subtasks,
    status: 'todo',
    createdAt: new Date()
  });
  
  return { insertedId: result.insertedId };
}

/**
 * Query 8: updateTaskStatus
 * -------------------------------------------------------------
 * Change a task's status field.
 */
async function updateTaskStatus(db, taskId, newStatus) {
  const result = await db.collection('tasks').updateOne(
    { _id: new ObjectId(taskId) },
    { $set: { status: newStatus } }
  );
  
  return { 
    matchedCount: result.matchedCount, 
    modifiedCount: result.modifiedCount 
  };
}

/**
 * Query 9: addTaskTag
 * -------------------------------------------------------------
 * Append a tag to a task's tags array, ONLY if not already present.
 */
async function addTaskTag(db, taskId, tag) {
  const result = await db.collection('tasks').updateOne(
    { _id: new ObjectId(taskId) },
    { $addToSet: { tags: tag } }
  );
  
  return { 
    matchedCount: result.matchedCount, 
    modifiedCount: result.modifiedCount 
  };
}

/**
 * Query 10: removeTaskTag
 * -------------------------------------------------------------
 * Remove a tag from a task's tags array.
 */
async function removeTaskTag(db, taskId, tag) {
  const result = await db.collection('tasks').updateOne(
    { _id: new ObjectId(taskId) },
    { $pull: { tags: tag } }
  );
  
  return { 
    matchedCount: result.matchedCount, 
    modifiedCount: result.modifiedCount 
  };
}

/**
 * Query 11: toggleSubtask
 * -------------------------------------------------------------
 * Inside a task's `subtasks` array, find the subtask whose title matches
 * and flip its `done` field.
 */
async function toggleSubtask(db, taskId, subtaskTitle, newDone) {
  const result = await db.collection('tasks').updateOne(
    { _id: new ObjectId(taskId), "subtasks.title": subtaskTitle },
    { $set: { "subtasks.$.done": newDone } }
  );
  
  return { 
    matchedCount: result.matchedCount, 
    modifiedCount: result.modifiedCount 
  };
}

/**
 * Query 12: deleteTask
 * -------------------------------------------------------------
 * Permanently delete a task.
 */
async function deleteTask(db, taskId) {
  const result = await db.collection('tasks').deleteOne(
    { _id: new ObjectId(taskId) }
  );
  
  return { deletedCount: result.deletedCount };
}

/**
 * Query 13: searchNotes
 * -------------------------------------------------------------
 * Find notes belonging to a user that match ANY of the given tags.
 * Optionally restrict to one project.
 */
async function searchNotes(db, ownerId, tags, projectId) {
  const filter = { ownerId: ownerId };
  
  // Tags filter: match ANY of the given tags
  if (tags && tags.length > 0) {
    filter.tags = { $in: tags };
  }
  
  // Optional project filter
  if (projectId) {
    filter.projectId = new ObjectId(projectId);
  }
  
  const notes = await db.collection('notes')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();
  
  return notes;
}

/**
 * Query 14: projectTaskSummary
 * -------------------------------------------------------------
 * For one user, return per-project counts of tasks grouped by status.
 * This uses $lookup as the NoSQL JOIN.
 */
async function projectTaskSummary(db, ownerId) {
  const pipeline = [
    // 1. Filter to this user's tasks
    { $match: { ownerId: ownerId } },
    
    // 2. Group by projectId and count by status
    { $group: { 
        _id: "$projectId",
        todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
        done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        total: { $sum: 1 }
    } },
    
    // 3. Lookup project names
    { $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "_id",
        as: "project"
    } },
    
    // 4. Unwind the project array (each task belongs to exactly one project)
    { $unwind: "$project" },
    
    // 5. Project into desired shape
    { $project: {
        _id: 1,
        projectName: "$project.name",
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 1
    } }
  ];
  
  const results = await db.collection('tasks').aggregate(pipeline).toArray();
  return results;
}

/**
 * Query 15: recentActivityFeed
 * -------------------------------------------------------------
 * The 10 most recently created tasks across all of a user's projects,
 * each one annotated with its project's name.
 */
async function recentActivityFeed(db, ownerId) {
  const pipeline = [
    // 1. Filter to this user's tasks
    { $match: { ownerId: ownerId } },
    
    // 2. Sort newest first
    { $sort: { createdAt: -1 } },
    
    // 3. Limit to 10
    { $limit: 10 },
    
    // 4. Lookup project names
    { $lookup: {
        from: "projects",
        localField: "projectId",
        foreignField: "_id",
        as: "project"
    } },
    
    // 5. Unwind the project array
    { $unwind: "$project" },
    
    // 6. Project the fields we want
    { $project: {
        _id: 1,
        title: 1,
        status: 1,
        priority: 1,
        createdAt: 1,
        projectId: 1,
        projectName: "$project.name"
    } }
  ];
  
  const results = await db.collection('tasks').aggregate(pipeline).toArray();
  return results;
}

// =============================================================================
//  EXPORTS — do not edit
// =============================================================================
module.exports = {
  signupUser,
  loginFindUser,
  listUserProjects,
  createProject,
  archiveProject,
  listProjectTasks,
  createTask,
  updateTaskStatus,
  addTaskTag,
  removeTaskTag,
  toggleSubtask,
  deleteTask,
  searchNotes,
  projectTaskSummary,
  recentActivityFeed
};