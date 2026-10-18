const mongoose=require('mongoose');
module.exports=mongoose.model('Availability',new mongoose.Schema({therapist_id:{type:mongoose.Schema.Types.ObjectId,ref:'Therapist',required:true,index:true},weekly:[{day:Number,start:String,end:String}],blockedSlots:[{startsAt:Date,endsAt:Date,reason:String}],sessionDuration:{type:Number,default:50},bufferMinutes:{type:Number,default:10}},{timestamps:true}));
