const mongoose = require('mongoose');
const TherapistSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true}, email:{type:String,required:true,unique:true,lowercase:true}, password_hash:{type:String,required:true},
  slug:{type:String,required:true,unique:true,lowercase:true}, bio:{type:String,default:''}, specializations:[String], languages:[String],
  location:{type:String,default:'India'}, sessionRate:{type:Number,default:1200,min:0}, tier:{type:String,default:'starter'}, avatarUrl:String,
  timezone:{type:String,default:'Asia/Kolkata'},
  bookingLockToken:{type:String,select:false},bookingLockExpiresAt:{type:Date,select:false},
  createdAt:{type:Date,default:Date.now}
},{timestamps:true});
module.exports=mongoose.model('Therapist',TherapistSchema);
