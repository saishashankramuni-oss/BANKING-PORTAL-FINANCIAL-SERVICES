const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

/* DATABASE */
mongoose.connect('mongodb://127.0.0.1:27017/bankDB')
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

/* ================= MODELS ================= */

const userSchema = new mongoose.Schema({
  name:String,
  username:String,
  password:String,
  email:String,
  phone:String,
  accountType:String,
  accountNumber:String,
  balance:Number,
  payees:[String]
});

const User = mongoose.model("User", userSchema);

const transactionSchema = new mongoose.Schema({
  user:String,
  type:String, // CREDIT / DEBIT
  amount:Number,
  balance:Number,
  toAccount:String,
  toName:String,
  date:{type:Date,default:Date.now}
});

const Transaction = mongoose.model("Transaction", transactionSchema);

/* ================= HELPERS ================= */

function generateAccountNumber(){
  return "AC"+Math.floor(100000000+Math.random()*900000000);
}

let currentOTP = "";

/* ================= ROUTES ================= */

// REGISTER
app.post('/api/register', async(req,res)=>{
  const {name,username,password,email,phone,accountType,balance} = req.body;

  const existing = await User.findOne({username});
  if(existing) return res.json({message:"User already exists"});

  if(balance < 500) return res.json({message:"Minimum ₹500 required"});

  const user = new User({
    name,username,password,email,phone,accountType,balance,
    accountNumber:generateAccountNumber(),
    payees:[]
  });

  await user.save();
  res.json({message:"Account Created Successfully"});
});

// LOGIN
app.post('/api/login', async(req,res)=>{
  const {username,password} = req.body;

  const user = await User.findOne({username,password});
  if(user) res.json(user);
  else res.json({message:"Invalid Login"});
});

// GET USER
app.get('/api/user/:username', async(req,res)=>{
  const user = await User.findOne({username:req.params.username});
  res.json(user);
});

// OTP
app.post('/api/send-otp',(req,res)=>{
  currentOTP = Math.floor(100000+Math.random()*900000).toString();
  console.log("OTP:",currentOTP);
  res.json({message:"OTP Sent"});
});

// TRANSFER
app.post('/api/transfer', async(req,res)=>{
  const {fromUser,toAccount,amount,otp} = req.body;

  if(otp !== currentOTP) return res.json({message:"Invalid OTP"});

  try{
    const sender = await User.findOne({username:fromUser});
    const receiver = await User.findOne({accountNumber:toAccount});

    if(!sender || !receiver) return res.json({message:"Account not found"});
    if(sender.balance < amount) return res.json({message:"Insufficient balance"});

    // update balances
    sender.balance -= amount;
    receiver.balance += amount;

    // save payee
    if(!sender.payees.includes(toAccount)){
      sender.payees.push(toAccount);
    }

    await sender.save();
    await receiver.save();

    // DEBIT (sender)
    await Transaction.create({
      user:sender.username,
      type:"DEBIT",
      amount,
      balance:sender.balance,
      toAccount:receiver.accountNumber,
      toName:receiver.username
    });

    // CREDIT (receiver)
    await Transaction.create({
      user:receiver.username,
      type:"CREDIT",
      amount,
      balance:receiver.balance,
      toAccount:sender.accountNumber,
      toName:sender.username
    });

    res.json({message:"Transfer successful"});

  }catch(err){
    res.json({message:"Error in transfer"});
  }
});

// TRANSACTIONS
app.get('/api/transactions/:username', async(req,res)=>{
  const data = await Transaction.find({user:req.params.username}).sort({date:-1});
  res.json(data);
});

app.listen(3000,()=>console.log("Server running on port 3000"));