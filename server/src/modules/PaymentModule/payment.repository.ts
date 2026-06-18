
import type { ClientSession } from 'mongoose';
import DB_Connection from '../../models/DB_Connection.js';
import type{ IPayment, IPaymentDocument } from './../../models/Schema/PaymentSchema.js';

class PaymentRepository{
    async createPayment(paymentData:Partial<IPayment>,options?: { session: ClientSession }):Promise<IPaymentDocument>{
        const newPayment = await new DB_Connection.Payment(paymentData)
        return await newPayment.save(options); 
    }
    async findByOrderId(orderId:string, amount:number, status:string):Promise<IPaymentDocument>{
        const existingPayment = await DB_Connection.Payment.findOneAndUpdate(
            {order: orderId}, 
            {amount: amount, status:status},
            {new:true}
        );
        return existingPayment
    }
      async findPaymentByOrderCode(orderCode:string):Promise<IPaymentDocument>{
        const existingPayment = await DB_Connection.Payment.findOne({orderCode:orderCode});
        return existingPayment
    }


    async findPaymentDetail(id:string):Promise<IPaymentDocument>{
        const existingPayment = await DB_Connection.Payment.findById(
            id
        ).populate({
            path:"order",
            populate: [
                { 
                    path: "table", 
                    select: "tableNumber" 
                },
                { 
                    path: "items"
                }
            ]
        });
        return existingPayment
    } 
    
    async changePaymentStatus(PaymentId:string, status:string, options?:{ session: ClientSession }):Promise<IPaymentDocument>{
        const newPayment = await DB_Connection.Payment.findByIdAndUpdate(PaymentId,{status:status},{new:true});
        return await newPayment.save(options)
    }

    async updatePayment(id:string, dataUpdate:Partial<IPayment>, options?:{ session: ClientSession } ):Promise<IPaymentDocument>{
        const updatedPayment = await DB_Connection.Payment.findByIdAndUpdate(
            id,
            dataUpdate,
            {new:true}
        );
        return await updatedPayment.save(options)
    }
}

export default new PaymentRepository();