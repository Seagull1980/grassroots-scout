import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = new Database(join(__dirname, 'forum.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // Disable foreign key constraints

// Create forum_posts table
db.exec(`
  CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General Discussions',
    is_locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
  )
`);

// Add category column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE forum_posts ADD COLUMN category TEXT DEFAULT 'General Discussions'`);
  console.log('✅ Category column added to forum_posts');
} catch (error) {
  // Column already exists, ignore error
}

// Add is_locked column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE forum_posts ADD COLUMN is_locked INTEGER DEFAULT 0`);
  console.log('✅ is_locked column added to forum_posts');
} catch (error) {
  // Column already exists, ignore error
}

db.exec(`
  CREATE TABLE IF NOT EXISTS forum_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_reply_id INTEGER,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
  )
`);

// Create content_flags table for flagging inappropriate content
db.exec(`
  CREATE TABLE IF NOT EXISTS content_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type TEXT NOT NULL,
    content_id INTEGER NOT NULL,
    flagged_by_user_id INTEGER NOT NULL,
    flagged_by_name TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by_user_id INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Forum posts, replies, and content_flags tables created/verified');

// Profanity filter - list of inappropriate words
const profanityList = [
  // Common profanity (add more as needed)
  'damn', 'hell', 'crap', 'bastard', 'bitch', 'ass', 'asshole',
  'shit', 'fuck', 'fucking', 'motherfucker', 'dick', 'cock', 
  'pussy', 'cunt', 'whore', 'slut', 'piss', 'nigger', 'nigga',
  'fag', 'faggot', 'retard', 'retarded', 'idiot', 'moron',
  // Add abusive terms
  'kill yourself', 'kys', 'die', 'hate you', 'loser', 'pathetic'
];

// Function to detect profanity
function containsProfanity(text) {
  const lowerText = text.toLowerCase();
  
  // Check for exact matches and word boundaries
  for (const word of profanityList) {
    // Create regex with word boundaries
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      return true;
    }
    
    // Also check for variations with special characters (e.g., "f*ck", "sh!t")
    const pattern = word.split('').join('[*@!#$%^&]?');
    const variationRegex = new RegExp(pattern, 'i');
    if (variationRegex.test(lowerText)) {
      return true;
    }
  }
  
  return false;
}

// Function to censor profanity
function censorProfanity(text) {
  let censoredText = text;
  
  for (const word of profanityList) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    censoredText = censoredText.replace(regex, (match) => {
      return '*'.repeat(match.length);
    });
  }
  
  return censoredText;
}

// GET /api/forum/posts - Get all posts (not deleted)
app.get('/api/forum/posts', (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT *
      FROM forum_posts
      WHERE is_deleted = 0
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const posts = db.prepare(query).all(...params);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/forum/posts/:id - Get single post
app.get('/api/forum/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const post = db.prepare(`
      SELECT *
      FROM forum_posts
      WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/forum/posts - Create new post
app.post('/api/forum/posts', (req, res) => {
  try {
    const { user_id, user_role, author_name, title, content, category } = req.body;
    
    // Validate required fields
    if (!user_id || !user_role || !author_name || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate category
    const validCategories = ['General Discussions', 'Website Discussions', 'Grassroots Discussions'];
    const postCategory = category && validCategories.includes(category) ? category : 'General Discussions';
    
    // Check for profanity
    if (containsProfanity(title) || containsProfanity(content)) {
      return res.status(400).json({ 
        error: 'Your post contains inappropriate language. Please revise and try again.',
        profanityDetected: true
      });
    }
    
    // Insert post
    const result = db.prepare(`
      INSERT INTO forum_posts (user_id, user_role, author_name, title, content, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user_id, user_role, author_name, title, content, postCategory);
    
    // Get the created post
    const newPost = db.prepare(`
      SELECT * FROM forum_posts WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/forum/posts/:id - Update post
app.put('/api/forum/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, user_id, category } = req.body;
    
    // Check if post exists and belongs to user
    const existingPost = db.prepare(`
      SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (existingPost.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }
    
    // Validate category if provided
    const validCategories = ['General Discussions', 'Website Discussions', 'Grassroots Discussions'];
    const postCategory = category && validCategories.includes(category) ? category : existingPost.category;
    
    // Check for profanity
    if (containsProfanity(title) || containsProfanity(content)) {
      return res.status(400).json({ 
        error: 'Your post contains inappropriate language. Please revise and try again.',
        profanityDetected: true
      });
    }
    
    // Update post
    db.prepare(`
      UPDATE forum_posts 
      SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, postCategory, id);
    
    // Get updated post
    const updatedPost = db.prepare(`
      SELECT * FROM forum_posts WHERE id = ?
    `).get(id);
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/forum/posts/:id - Soft delete post
app.delete('/api/forum/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role } = req.body;
    
    // Check if post exists
    const existingPost = db.prepare(`
      SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Allow deletion if user is admin OR post owner
    if (user_role !== 'Admin' && existingPost.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }
    
    // Soft delete
    db.prepare(`
      UPDATE forum_posts 
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PATCH /api/forum/posts/:id/lock - Lock/unlock thread (admin only)
app.patch('/api/forum/posts/:id/lock', (req, res) => {
  try {
    const { id } = req.params;
    const { user_role, is_locked } = req.body;
    
    // Check if user is admin
    if (user_role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can lock/unlock threads' });
    }
    
    // Check if post exists
    const existingPost = db.prepare(`
      SELECT * FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update locked status
    db.prepare(`
      UPDATE forum_posts 
      SET is_locked = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(is_locked ? 1 : 0, id);
    
    // Get updated post
    const updatedPost = db.prepare(`
      SELECT * FROM forum_posts WHERE id = ?
    `).get(id);
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error locking/unlocking thread:', error);
    res.status(500).json({ error: 'Failed to lock/unlock thread' });
  }
});

// GET /api/forum/posts/user/:userId - Get posts by user
app.get('/api/forum/posts/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const posts = db.prepare(`
      SELECT * FROM forum_posts 
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `).all(userId);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// GET /api/forum/posts/:postId/replies - Get all replies for a post
app.get('/api/forum/posts/:postId/replies', (req, res) => {
  try {
    const { postId } = req.params;
    
    const replies = db.prepare(`
      SELECT 
        r.*,
        parent.author_name as parent_author_name
      FROM forum_replies r
      LEFT JOIN forum_replies parent ON r.parent_reply_id = parent.id
      WHERE r.post_id = ? AND r.is_deleted = 0
      ORDER BY r.created_at ASC
    `).all(postId);
    
    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// POST /api/forum/posts/:postId/replies - Create a reply
app.post('/api/forum/posts/:postId/replies', (req, res) => {
  try {
    const { postId } = req.params;
    const { user_id, user_role, author_name, content, parent_reply_id } = req.body;
    
    // Validate required fields
    if (!user_id || !user_role || !author_name || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if post exists and is not locked
    const post = db.prepare(`
      SELECT id, is_locked FROM forum_posts WHERE id = ? AND is_deleted = 0
    `).get(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check if thread is locked
    if (post.is_locked) {
      return res.status(403).json({ error: 'This thread has been locked by an administrator' });
    }
    
    // If replying to a reply, check if parent reply exists
    if (parent_reply_id) {
      const parentReply = db.prepare(`
        SELECT id FROM forum_replies WHERE id = ? AND post_id = ? AND is_deleted = 0
      `).get(parent_reply_id, postId);
      
      if (!parentReply) {
        return res.status(404).json({ error: 'Parent reply not found' });
      }
    }
    
    // Check for profanity
    if (containsProfanity(content)) {
      return res.status(400).json({ 
        error: 'Your reply contains inappropriate language. Please revise and try again.',
        profanityDetected: true
      });
    }
    
    // Insert reply
    const result = db.prepare(`
      INSERT INTO forum_replies (post_id, parent_reply_id, user_id, user_role, author_name, content)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(postId, parent_reply_id || null, user_id, user_role, author_name, content);
    
    // Get the created reply with parent info
    const newReply = db.prepare(`
      SELECT 
        r.*,
        parent.author_name as parent_author_name
      FROM forum_replies r
      LEFT JOIN forum_replies parent ON r.parent_reply_id = parent.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newReply);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// DELETE /api/forum/replies/:id - Delete a reply
app.delete('/api/forum/replies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role } = req.body;
    
    // Check if reply exists and belongs to user
    const existingReply = db.prepare(`
      SELECT * FROM forum_replies WHERE id = ? AND is_deleted = 0
    `).get(id);
    
    if (!existingReply) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    
    // Allow deletion if admin or if it's the user's own reply
    if (user_role !== 'Admin' && existingReply.user_id !== user_id) {
      return res.status(403).json({ error: 'You can only delete your own replies' });
    }
    
    // Soft delete
    db.prepare(`
      UPDATE forum_replies 
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'forum-server' });
});

// POST /api/forum/flag - Flag content as inappropriate
app.post('/api/forum/flag', (req, res) => {
  try {
    const { content_type, content_id, user_id, user_name, reason } = req.body;
    
    // Validate required fields
    if (!content_type || !content_id || !user_id || !user_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate content_type
    if (!['post', 'reply'].includes(content_type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }
    
    // Check if content exists
    if (content_type === 'post') {
      const post = db.prepare('SELECT id FROM forum_posts WHERE id = ? AND is_deleted = 0').get(content_id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
    } else {
      const reply = db.prepare('SELECT id FROM forum_replies WHERE id = ? AND is_deleted = 0').get(content_id);
      if (!reply) {
        return res.status(404).json({ error: 'Reply not found' });
      }
    }
    
    // Check if user already flagged this content
    const existingFlag = db.prepare(`
      SELECT id FROM content_flags 
      WHERE content_type = ? AND content_id = ? AND flagged_by_user_id = ?
    `).get(content_type, content_id, user_id);
    
    if (existingFlag) {
      return res.status(400).json({ error: 'You have already flagged this content' });
    }
    
    // Create flag
    const result = db.prepare(`
      INSERT INTO content_flags (content_type, content_id, flagged_by_user_id, flagged_by_name, reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(content_type, content_id, user_id, user_name, reason || 'No reason provided');
    
    const newFlag = db.prepare('SELECT * FROM content_flags WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({ message: 'Content flagged successfully', flag: newFlag });
  } catch (error) {
    console.error('Error flagging content:', error);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

// GET /api/forum/flags - Get all flags (admin only)
app.get('/api/forum/flags', (req, res) => {
  try {
    const { user_role, status } = req.query;
    
    // Check if user is admin
    if (user_role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can view flags' });
    }
    
    let query = `
      SELECT 
        f.*,
        CASE 
          WHEN f.content_type = 'post' THEN p.title
          WHEN f.content_type = 'reply' THEN SUBSTR(r.content, 1, 100)
        END as content_preview,
        CASE 
          WHEN f.content_type = 'post' THEN p.author_name
          WHEN f.content_type = 'reply' THEN r.author_name
        END as content_author,
        CASE 
          WHEN f.content_type = 'post' THEN p.user_id
          WHEN f.content_type = 'reply' THEN r.user_id
        END as content_author_id
      FROM content_flags f
      LEFT JOIN forum_posts p ON f.content_type = 'post' AND f.content_id = p.id
      LEFT JOIN forum_replies r ON f.content_type = 'reply' AND f.content_id = r.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND f.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY f.created_at DESC`;
    
    const flags = db.prepare(query).all(...params);
    
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

// PATCH /api/forum/flags/:id - Update flag status (admin only)
app.patch('/api/forum/flags/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_role, user_id, status, action } = req.body;
    
    // Check if user is admin
    if (user_role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can review flags' });
    }
    
    // Validate status
    if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get the flag to check content
    const flag = db.prepare('SELECT * FROM content_flags WHERE id = ?').get(id);
    
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    
    // If action is 'delete', delete the flagged content
    if (action === 'delete') {
      if (flag.content_type === 'post') {
        db.prepare('UPDATE forum_posts SET is_deleted = 1 WHERE id = ?').run(flag.content_id);
      } else {
        db.prepare('UPDATE forum_replies SET is_deleted = 1 WHERE id = ?').run(flag.content_id);
      }
    }
    
    // Update flag status
    db.prepare(`
      UPDATE content_flags 
      SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, user_id, id);
    
    const updatedFlag = db.prepare('SELECT * FROM content_flags WHERE id = ?').get(id);
    
    res.json({ message: 'Flag updated successfully', flag: updatedFlag });
  } catch (error) {
    console.error('Error updating flag:', error);
    res.status(500).json({ error: 'Failed to update flag' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Forum server running on port ${PORT}`);
});
