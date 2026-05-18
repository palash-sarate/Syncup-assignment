const mongoose = require('mongoose');

const PollOptionSchema = new mongoose.Schema({
  optionText: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const WorkoutItemSchema = new mongoose.Schema({
  itemText: { type: String, required: true },
  isCompleted: { type: Boolean, default: false }
});

const FeedSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  content: { 
    type: String, 
    required: true,
    trim: true 
  },
  type: { 
    type: String, 
    enum: ['text', 'video', 'image', 'poll', 'workout', 'goal'], 
    default: 'text' 
  },
  coachName: { 
    type: String, 
    required: true,
    trim: true 
  },
  coachUsername: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'sarah'
  },
  coachType: {
    type: String,
    trim: true,
    default: 'Fitness Specialist'
  },
  visibility: {
    type: String,
    enum: ['global', 'subscribers', 'both'],
    default: 'both'
  },
  mediaUrl: { 
    type: String,
    trim: true,
    default: ''
  },
  messageId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  // Interactive Poll
  pollOptions: [PollOptionSchema],
  
  // Interactive Workout Checklist
  workoutItems: [WorkoutItemSchema],
  
  // Interactive Goal Meter
  goalTarget: { type: Number },
  goalCurrent: { type: Number, default: 0 },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create indexes to optimize reading by creation date and message ID queries
FeedSchema.index({ createdAt: -1 });
FeedSchema.index({ messageId: 1 }, { unique: true });

module.exports = mongoose.model('Feed', FeedSchema);
