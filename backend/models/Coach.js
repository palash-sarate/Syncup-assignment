const mongoose = require('mongoose');

const CoachSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  type: { 
    type: String, 
    required: true, 
    trim: true // e.g. 'Fitness Specialist', 'Nutritionist', 'Mindfulness Guide', 'Yoga Instructor'
  },
  bio: { 
    type: String, 
    default: 'Certified professional dedicated to optimizing your personal development, performance, and wellness.' 
  },
  avatarUrl: { 
    type: String, 
    default: '' 
  }
});

module.exports = mongoose.model('Coach', CoachSchema);
