const mongoose=require('mongoose');
module.exports=mongoose.model('Package',new mongoose.Schema({therapist_id:{type:mongoose.Schema.Types.ObjectId,ref:'Therapist',required:true},name:{type:String,required:true},sessions:{type:Number,enum:[3,6,12],required:true},price:{type:Number,required:true},validityDays:{type:Number,default:180},active:{type:Boolean,default:true}},{timestamps:true}));
