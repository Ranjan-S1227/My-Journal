require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const methodOverride=require("method-override");

const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const {google}=require('googleapis');




const app = express();

var http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);





// DATE 
const date = new Date();
var day = date.getDate();
var i = date.getMonth() + 1;
var year = date.getFullYear();

switch (i) {
    case 1:
        month="Janaury"
        break;
    case 2:
        month="February"
        break;   
    case 3:
        month="March"
        break; 
    case 4:
        month="April"
        break;   
    case 5:
        month="May"
        break; 
    case 6:
        month="June"
        break;
    case 7:
        month="July"
        break; 
    case 8:
        month="August"
        break; 
    case 9:
        month="September"
        break;
    case 10:
        month="October"
        break;
    case 11:
        month="November"
        break;                                                                  
    case 12:
        month="December"
        break;    

    default:
        break;
}

// DATE

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use('*/css', express.static('public/css'));
app.use('*/images', express.static('public/images'));
app.use(methodOverride('_method'));
app.use(session({
  secret: "This is my secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.set("strictQuery", false);
// mongoose.connect("mongodb://localhost:27017/mjUsersDB",{useNewUrlParser: true});


mongoose.connect("mongodb+srv://RanjanSatish:Ranjan1227@myjournal.59ylq4n.mongodb.net/mjUsersDB",{useNewUrlParser: true});



const userSchema = new mongoose.Schema({
  name:String,
  age:Number,
  email:String,
  password:String,
  country:String,
  googleId:String,
  username:String,
  profilePic:String,
  
});



const postSchema = new mongoose.Schema({
  username:String,
  post:String,
  postTitle:String,
  dateOfPost:String,
  profilePicture:String,
  picOfDay:String,
  comments:[{
    commentorName:String,
    commentor:String,
    commented:String,  
  }]
 

  
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



//Multer
var storage=multer.diskStorage({
  destination:"public/images",
  filename: (req,file,cb)=>{
    cb(null,file.originalname)
  }
})

var upload = multer({storage:storage});

const User = mongoose.model("User",userSchema);
const Post = mongoose.model("Post",postSchema);



passport.use(User.createStrategy());


passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.displayName });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/intro",
  // the below line is added because google+ is no more supported.
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

},
function(accessToken, refreshToken, profile, cb) {
    //npm i mongoose-findorcreate
    // console.log(profile)
    //console.log(accessToken)
  User.findOrCreate({ googleId: profile.id,name:profile.displayName,username:profile._json.email}, function (err, user) {
    return cb(err, user);
   
  });
 
}

));


//Declarations
var currentDay =day+"-"+month+"-"+year;
var myself;



const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID,process.env.CLIENT_SECRET,process.env.REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token:process.env.REFRESH_TOKEN})



//GET
app.get("/home", function(req,res){
  if(req.isAuthenticated()){

    Post.find({},function(err,found){
      if(err){
        console.log(err)
      }
      else{
         
         var me=(req.user.username)
          res.render("home",{data:found,today:currentDay,usr:me})
          // console.log(found)
        
        
      }
    })

  }
  else{
    res.redirect("/head");
  }
 

});

app.get("/intro",function(req,res){
  if(req.isAuthenticated()){
  res.render("intro")
  }
  else{
    res.render("head")
  }
})

app.get("/about2",function(req,res){
  if(req.isAuthenticated()){
  res.render("about2")
  }
  else{
    res.render("head")
  }
})

app.get("/",function(req,res){
  
  res.render("head");

})

app.get("/login", function(req,res){
  res.render("login");
});

app.get("/auth/google",
passport.authenticate('google', {scope: ["profile","email"]}));

app.get('/auth/google/intro', 
  passport.authenticate('google', { failureRedirect: '/head' }),
  function(req, res) {
    // Successful authentication, redirect intro.
    res.redirect('/intro');
  });

  app.get("/logout",function(req,res){
    req.logout(function(err){
      if(err){
          console.log(err);
      }
  });    
  res.redirect("/");
  });

app.get("/deleteAcc",function(req,res){
  if(req.isAuthenticated()){
   
    User.deleteOne({"_id":req.user.id},function(err){
      if(err){
        console.log(err);
      }
      else{
        console.log("Account deleted");
       
      }

    })

    Post.deleteOne({"username":req.user.username},function(err){
      if(err){console.log(err)}
      else{
        res.redirect("/head");
      }
    })
    
  }
  else{
    res.redirect("/head");
  }
 
})

app.get("/forgotPassword",(req,res)=>{
  res.render("forgot")
})

  app.get("/myPosts",function(req,res){
   if(req.isAuthenticated()){
     var myName = req.user.username;
     Post.find({username:myName},function(err,foundPost){
       if(err){
         console.log(err)
       }
       else{
        //  console.log(foundPost);
         res.render("myPosts",{myName:myName,myPosts:foundPost})
       }
     })

    
   }
   else{
     res.redirect("/head");
   }
  })

app.get("/about", function(req,res){
  
    res.render("about");
  
  
  
});

app.get("/editProfile",function(req,res){
  if(req.isAuthenticated()){
  User.find({username:req.user.username},(err,found)=>{
    if(err){console.log(err)}
    else{
      for( var i=0;i<found.length;i++){
        res.render("editProfile",{name:found[i].name,age:found[i].age,country:found[i].country,username:found[i].username})

      }

    }
    
  })
}
else{
    res.redirect("/head");
  }
})

app.get("/editProfPic",function(req,res){
  if(req.isAuthenticated()){
    res.render("editProfPic");
  }
  else{
    res.redirect("/head");
  }
})

app.get("/compose",  function(req,res){
if(req.isAuthenticated()){
  User.findByUsername(req.user.username,function(err,foundUser){
    
    var flag=0;
    Post.find({}, function(err,found){
     if(err){
       console.log(err);
     }
     else{
       var thisUser=req.user.username;
      //  console.log(found);
 
       for(var i=0;i<found.length;i++){
         if(found[i].username==thisUser && found[i].dateOfPost==currentDay){
           flag=1;
           break;
         }
       }
       
       res.render("compose",{flag:flag,foundUser:foundUser})
 
 
     }
   })

  })


}else{
  res.redirect("/head");
}
  
})

app.get("/profile",function(req,res){
 
  if(req.isAuthenticated()){
  User.find({username:req.user.username}, function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      // console.log(foundUser);
      for(var i=0;i<foundUser.length;i++){
        res.render("profile",{profileImg:foundUser[i].profilePic,myName:foundUser[i].name,username:foundUser[i].username})
      }
    }
  })
}
  else{
    res.redirect("/head");
  }
});

app.get("/head",function(req,res){
  res.render("head");
  
  
})

app.get("/register",function(req,res){
  res.render("register");
})


app.get("/posts/:id", async (req,res)=>{
  
  await Post.findById(req.params.id,(err,found)=>{
   
    var thisUser=req.user.username
    
    if(err){
      console.log(err);
    }
    else{
      User.find({username:req.user.username},function(err,foundUser){
        // console.log(foundUser);
        if(err){console.log(err)}
        else{
          
          var myName;
          var namee=req.user.username
          // console.log(namee)
          for(var i=0;i<foundUser.length;i++){
            
            myName=foundUser[i].name
          }
          res.render("post",{myName:myName,currUser:thisUser,title:found.postTitle,content:found.post,postImg:found.picOfDay,thisPostId:req.params.id,comments:found.comments,namee:namee});

        }
      })

    }
  })

    });



app.get("/edit/:id", async(req,res)=>{
  const myPost = await Post.findById(req.params.id)
  // // console.log(post) 
  res.render("editPost",{myPost:myPost});
})


function saveArticleAndRedirect(path){
  return (req,res)=>{
    
  }
}



app.get("/myPosts/:id", async (req,res)=>{
  
  await Post.findById(req.params.id,(err,found)=>{
   
    var thisUser=req.user.username
    
    if(err){
      console.log(err);
    }
    else{
      User.find({username:req.user.username},function(err,foundUser){
        // console.log(foundUser);
        if(err){console.log(err)}
        else{
          var namee=req.user.username
          var myName;
          
          for(var i=0;i<foundUser.length;i++){
            
            myName=foundUser[i].name
          }
          res.render("postForMyPost",{myName:myName,currUser:thisUser,title:found.postTitle,content:found.post,postImg:found.picOfDay,thisPostId:req.params.id,comments:found.comments,namee:namee});

        }
      })

    }
  })

  
});






//POST
app.post("/compose",upload.single("file"), function(req,res){

  // console.log(req.file.filename)
  // console.log(req.body.postTitle)
  // console.log(req.body.postBody)

// posting data to DB
User.find({username:req.user.username}, function(err,foundUser){
      if(err){
        console.log(err);
      }
      else{
         
        for(var i=0;i<foundUser.length;i++){
          myself=foundUser[i].profilePic;
          var postData = new Post({
            postTitle:req.body.postTitle,
            post:req.body.postBody,
            username:req.user.username,
            dateOfPost:currentDay,
            profilePicture:myself,

            picOfDay:req.file.filename

            });

            // console.log(postData);
            postData.save();
            res.redirect("/home")
            
          
        }
      }
    })

    



}
);

app.post("/register",upload.single("Pfile"),function(req,res){
User.register({username:req.body.username,name:req.body.personName,profilePic:req.file.filename,age:req.body.age,country:req.body.country},req.body.password,function(err,user){
  if(err){
    console.log(err);
  }
  else{
    passport.authenticate("local")(req,res,function(){
      
      res.redirect("/intro")
    })
  }
})
});

app.post("/login",function(req,res){
  const user = new User({
    username:req.body.username,
    password:req.body.password
  })
 
  req.login(user,function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home");
        
        
      })
    }
  })
})

app.post("/editProfile",function(req,res){

  
User.updateOne(
  {"_id":req.user.id},
  {$set:{"username":req.body.usrname,"name":req.body.uname,"age":req.body.age,"country":req.body.country }},
  function(err){
    console.log(err)
  }
);


User.findByUsername(req.user.username, function(err, user) {
  if (err) {
      res.send(err);
  } else {
      user.setPassword(
      req.body.passwd, function (err) {
          if (err) {
              res.send(err);
          } else {
            user.save(function(err){
              if(err){
                console.log(err);
              }
              else{
                res.redirect("/home")
              }
            })
        }
          }
      )};
      
});

});


app.post("/editProfPic",upload.single("myImg"),function(req,res){
  User.updateOne(
    {"_id":req.user.id},
    {$set:{"profilePic":req.file.filename }},
    function(err){
      console.log(err)
    }
  );
  Post.updateMany(
    {"username":req.user.username},
    {$set:{"profilePicture":req.file.filename }},
    function(err){
      console.log(err)
    }

  );
  res.redirect("profile");
})

app.post("/editpost",upload.single("file"),(req,res)=>{
  // console.log(req.body.postTitle)
  // console.log(req.body.post)
  // console.log(req.file.filename)
  // console.log(req.body.idPost)

  Post.updateOne({"_id":req.body.idPost},
  {
    $set:{
      "postTitle":req.body.postTitle,
      'post':req.body.post,
      "picOfDay":req.file.filename
    }
  },(post)=>{
    res.send("Updated Successfully");
  }
  
  
  )
 
})


app.delete('/:id',async(req,res)=>{

 await Post.findByIdAndDelete(req.params.id)
  res.redirect("/home");
})


app.post("/doComment",(req,res)=>{
  var profileImage;
  User.findByUsername(req.body.commentUser,function(err,found){
    if(err){
      console.log(err);

    }
    else{
      profileImage=found.profilePic
      Post.updateOne({"_id":req.body.postId},{
        $push:{
          "comments":{"commentor":req.body.commentUser,"commented":req.body.hisComment,"commentorName":req.body.myName,"profile_pic":profileImage}
        }
      },function(error,post){
        res.send({
          text:"Commented !",
          _id:Post.insertedId
        })
      }
      )
      
    }
  })
 
 
})


 
app.delete('/del/:id/:comment_id', async (req, res) => {
  try {
    var postId=req.params.id;

    const post = await Post.findById(req.params.id);

    // Pull out comment
    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );

    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment does not exist' });
    }

 

    // Get remove index
    const removeIndex = post.comments
      .map(comment => comment.user + String)
      .indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);

    await post.save();

    res.redirect("/home")
  } catch (err) {
    console.error(err.message);
    
  }
});





app.get("/reset-password/:id/:token",(req,res)=>{
const {id,token}=req.params


const secret=process.env.JWT_SECRET+id;
try {
  const payload=jwt.verify(token,secret)
  res.render("reset-password")
} catch (error) {
  console.log(error.message)
  res.send(error.message)
}

});


app.post("/reset-password/:id/:token",(req,res)=>{
  const {id,token}=req.params
const {password,password2}=req.body
if(password!=password2){
  res.send("Passwords doesn't match !")
}
else{
  const secret=process.env.JWT_SECRET+id;
  try {
    const payload=jwt.verify(token,secret)
    User.findById(id, function(err, user) {
      if (err) {
          res.send(err);
      } else {
          user.setPassword(
          password2, function (err) {
              if (err) {
                  res.send(err);
              } else {
                user.save(function(err){
                  if(err){
                    console.log(err);
                  }
                  else{
                    res.send("Password Changed Successfully !")
                    
                  }
                })
            }
              }
          )};
    
    
            } )

            
  } catch (error) {
    console.log(error.message)
    res.send(error.message)
  }
}

  });




app.post("/forgotPassword",(req,res)=>{

User.find({username:req.body.email},(err,found)=>{
  if(err){
    console.log(err);
  }
  else{
    
    if(found.length==1){
      // console.log(found)

      //creating one time link valid for 15mins
      for (var i=0;i<found.length;i++){
        const secret=process.env.JWT_SECRET+found[i]._id;
        const payload={
          email:found[i].username,
          id:found[i]._id
        }
        const token=jwt.sign(payload,secret,{expiresIn:"15m"});
        const link=`http://localhost:3000/reset-password/${found[i]._id}/${token}`
        console.log(link)

        async function sendMail(){
          try{
            const accessToken=await oAuth2Client.getAccessToken()
            const transport = nodemailer.createTransport({
              service:"gmail",
              auth:{
                type:"OAuth2",
                user:"higuys1227@gmail.com",
                clientId:process.env.CLIENT_ID,
                clientSecret:process.env.CLIENT_SECRET,
                refreshToken:process.env.REFRESH_TOKEN,
                accessToken:accessToken
              }
        
            })
            const mailOptions = {
              from:"My Journal <higuys1227@gmail.com>",
              to:req.body.email,
              subject:"Password Reset Link",
              text:link
            }
            const result=transport.sendMail(mailOptions)
            return result
        
          }catch(error){
            return error;
          }
        }
        sendMail().then(result => console.log("Email sent",result)).catch((error)=>console.log(error));

      }
      


    }
    else{
      res.send();
    }
    

    
  }
})


})
 
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on("new_comment", function(comment){
    io.emit("new_comment",comment)
  })
});


server.listen(3000, function() {
  console.log("Server started on port 3000");
});

