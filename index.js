const express=require("express");
const mongoose=require("mongoose");
const { nanoid } = require('nanoid');
const { v4: uuidv4 } = require('uuid');
const {setuser,getuser,sessionidchecker}=require('./services/auth');
const cookieparser=require('cookie-parser');

const dotenv=require("dotenv");
const mongourl=process.env.mongourl;

const app=express();
const PORT=5001;

app.use(cookieparser());
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.set("view engine","ejs");

mongoose.connect(mongourl)
.then(console.log("MongoDB connected"));

const urlschema=new mongoose.Schema({
    shortid:{
        type:String
    },
    redirectedurl:{
        type:String
    },
    totalclicks:{
        type:Number
    },
    visithistory:[{
        timestamp:{
            type:Number
        }
    }],
    createdby:{
        type:mongoose.Schema.ObjectId,
        ref: 'users'
    }
});
const URL=new mongoose.model("urls",urlschema);


app.get('/',async(req,res)=>{
    if(req.cookies.uid ){
        return res.redirect('/home');
    }
    return res.redirect('/auth/login');
})

app.get('/home',async(req,res)=>{
    const uid=req.cookies?.uid;
    if(uid && getuser(uid)){
        const user=getuser(uid);
        const onlyurls=await URL.find({createdby:user._id}).populate({path:'createdby',select:'name'});
        return res.render("home",{username:user.name,arr:onlyurls});
    }
    else{
        const onlyurls=await URL.find({}).populate({path:'createdby',select:'name'});
        return res.render("home",{arr:onlyurls});
    }
})

app.get('/urls',async (req,res)=>{
    const urls=await URL.find();
    return res.json(urls);
})

app.get("/:sID([a-zA-Z0-9_-]{8})",async (req,res)=>{
    const sID=req.params.sID;
    const finder = await URL.findOneAndUpdate(
      { shortid: sID },
      {
        $push: {
          visithistory: {
            timestamp: Date.now(),
          },
        },
        $inc: { totalclicks: 1 },
      }
    );
    return res.redirect(finder.redirectedurl.startsWith("http://")||(finder.redirectedurl.startsWith("https://"))?finder.redirectedurl:'https://'+finder.redirectedurl);
});

app.post('/',sessionidchecker,async (req,res)=>{
    const sid=nanoid(8);
    const body=req.body;
    let rurl=body.rurl;
    // if(!rurl.startsWith("http://")&&(!rurl.startsWith("https://"))){
    //     rurl='https://'+rurl;
    // }
    await URL.create({
        shortid:sid,
        redirectedurl:rurl,
        visithistory:[],
        createdby:req.user._id
    });
    const user=req.user;
    const urls=await URL.find({createdby:user._id});
    return res.render("home",({id:sid,arr:urls,username:user.name}))
});

app.get("/analytics/:sid",async(req,res)=>{
    const sID=req.params.sid;
    const finder=await URL.findOne({shortid:sID});
    return res.json({totalclicks:finder.totalclicks});
});


//USER AUTH ROUTES;

const userschema=new mongoose.Schema({
    name:{
        type:String
    },
    email:{
        type:String
    },
    password:{
        type:String
    }
})

const USER=new mongoose.model("users",userschema);

app.post('/auth',async(req,res)=>{
    const {name,email,password}=req.body;
    const user=await USER.create({
        name,email,password
    })
    return res.redirect('/auth/login');
})

app.get("/auth/signup",(req,res)=>{
    return res.render("signup");
})
app.post('/auth/login',async (req,res)=>{
    const {email,password}=req.body;
    const user=await USER.findOne({
        email:email,
        password:password
    });
    if(!user){
        return res.render('login',{msg:'Log In failed!'});
    }
    const token=setuser(user);
    res.cookie('uid',token,{expires:new Date(Date.now()+1000000)});
    return res.redirect('/home');
})
app.get('/auth/login',(req,res)=>{
    res.clearCookie('uid');
    return res.render('login');
})

app.get('/auth/users',async(req,res)=>{
    const users=await USER.find({});
    return res.json(users);
})


app.listen(PORT,()=>{console.log(`Server running at port ${PORT}`)});

