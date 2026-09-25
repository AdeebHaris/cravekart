import express from 'express'
import dotenv from 'dotenv'
import router from './routes/subRoutes.ts';
import cors from 'cors'

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }))

app.use(express.json());

app.use('/api', router)


app.listen(5000,()=> console.log(`server is running on port 5000`))