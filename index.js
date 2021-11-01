const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
var admin = require("firebase-admin");


const app = express();
const port = process.env.PORT || 5000

//firebase addmin initialization


var serviceAccount = require('./ema-jhon-simple-5c7ab-firebase-adminsdk-xctzb-665bf6f5d3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3zhcn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// console.log(uri)

async function verifyToken(req, res, next){
    
   if(req.headers.authorization?.startsWith('Bearer ')){
       const idToken=req.headers.authorization.split('Bearer ')[1];
       
       try{
             const decodedUser= await admin.auth().verifyIdToken(idToken)
             req.decodedUserEmail =decodedUser.email;
       }
       catch{

       }
   }
   
   next()
}

async function run() {
    try
    {
        await client.connect()
        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders')
        //get products api
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({})
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count()
            if (page)
            {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else
            {
                products = await cursor.toArray();
            }
            
            
            res.send({ count, products })
        })

        //post api
        app.post('/products/bykeys', async (req, res) => {
            console.log(req.body)
            const keys = req.body
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            
            res.json(products);
        })
       
        //add orders api
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createAt= new Date()
            const result = await orderCollection.insertOne(order);
            res.json(result)
        })
       //get orders api
       app.get('/orders',verifyToken, async(req,res)=>{
        
           const email =req.query.email;
           if(req.decodedUserEmail === email){
                   const query={email: email}
                    const cursor = orderCollection.find(query)
                    const result= await cursor.toArray();
                    res.json(result)
           }
           else{
               res.status(401).json({message:'user authorization not found'})
           }
           
         
             
       })


    }
    finally
    {
        // await client.close()
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('this is server');
});

app.listen(port, () => {
    console.log('this is port', port);
});

