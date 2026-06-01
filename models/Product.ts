import mongoose, { Schema } from "mongoose";
const ProductSchema = new Schema({
  name:{type:String,required:true}, description:{type:String,required:true},
  price:{type:Number,required:true}, images:[String],
  category:{type:String,enum:["accessories","clothing","handicrafts","merchandise"],required:true},
  relatedSeries:{type:String,default:""}, stock:{type:Number,default:100},
  rating:{type:Number,default:4.3}, reviews:{type:Number,default:0}, tags:[String],
},{timestamps:true});
export const ProductModel = mongoose.models.Product || mongoose.model("Product",ProductSchema);
