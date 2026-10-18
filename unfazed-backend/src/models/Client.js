const mongoose=require('mongoose');
const ClientSchema=new mongoose.Schema({therapist_id:{type:mongoose.Schema.Types.ObjectId,ref:'Therapist',required:true,index:true},name:{type:String,required:true},email:{type:String,lowercase:true},phone:String,status:{type:String,enum:['active','paused','completed'],default:'active'},tags:[String],presentingConcern:String,history:String,consent:{accepted:{type:Boolean,default:false},acceptedAt:Date},lastSessionAt:Date},{timestamps:true});
module.exports=mongoose.model('Client',ClientSchema);
