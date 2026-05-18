const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  clientUsername: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true 
  },
  coachUsername: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure a client can subscribe to a coach only once
SubscriptionSchema.index({ clientUsername: 1, coachUsername: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
