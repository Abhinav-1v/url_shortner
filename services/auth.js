const jwt=require('jsonwebtoken');

const secretkey='abhinav@10';

function setuser(user){
    
    return jwt.sign({
        _id:user._id,
        name:user.name,
    },secretkey);
}

function getuser(token){
    try {
        const ans=jwt.verify(token,secretkey);
        return ans;

    } catch (error) {
        return null;
    }
}

function sessionidchecker(req,res,next){
    const useruid=req.cookies?.uid;
    if(!useruid){
        return res.redirect('/auth/login');
    }
    const user=getuser(useruid);
    if(!user){
        return res.redirect('/auth/login');
    }
    req.user=user;
    next();
}


module.exports={setuser,getuser,sessionidchecker};
