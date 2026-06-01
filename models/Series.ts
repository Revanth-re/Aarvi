import mongoose, { Schema } from "mongoose";
const EpSchema = new Schema({
  title:{type:String,required:true}, description:{type:String,default:""},
  duration:{type:Number,default:0}, audioUrl:{type:String,default:""},
  episodeNumber:{type:Number,required:true}, isLocked:{type:Boolean,default:false},
  transcript:{type:String,default:""}, playCount:{type:Number,default:0},
},{timestamps:true});
const SeriesSchema = new Schema({
  title:{type:String,required:true}, description:{type:String,required:true},
  coverImage:{type:String,default:""}, genre:{type:String,required:true},
  language:{type:String,default:"English"}, narrator:{type:String,default:""},
  rating:{type:Number,default:4.5}, totalEpisodes:{type:Number,default:0},
  episodes:[EpSchema], tags:[String],
  isFeatured:{type:Boolean,default:false}, isTrending:{type:Boolean,default:false},
  totalPlays:{type:Number,default:0},
},{timestamps:true});
export const SeriesModel = mongoose.models.Series || mongoose.model("Series",SeriesSchema);
