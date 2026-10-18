const mongoose=require('mongoose');
module.exports=mongoose.model('Lead',new mongoose.Schema({therapist_id:{type:mongoose.Schema.Types.ObjectId,ref:'Therapist',required:true},name:String,email:String,phone:String,source:{type:String,default:'profile'},status:{type:String,enum:['new','contacted','converted','closed'],default:'new'},message:String},{timestamps:true}));
