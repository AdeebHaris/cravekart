import { Response, Request } from 'express'

interface SSEClient{
    id: string;
    res: Response;
}

let clients: SSEClient[] = [];

setInterval(()=>{
    clients.forEach(client=>{
        client.res.write(':ping\n\n');
    })
},25000);

export const subscribeSSE = (req:Request,res:Response)=>{
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection','keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientId = `${Date.now()}-${Math.random()}`;
    const newClient: SSEClient = { id: clientId, res};

    clients.push(newClient);
    console.log(`[SSE] Client connected: ${clientId}. Total active clients: ${clients.length}`);

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', meessage: 'SSE Stream '})}\n\n`)
    
    req.on('close', ()=>{
        clients = clients.filter(c=>c.id !== clientId);
        console.log(`[SSE] Client disconnected: ${clientId}. Remaining clients: ${clients.length}`);
    });
}

export const broadcastOrderEvent = (eventData: { type: string; order?: any }) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  console.log(`[SSE] Broadcasting event '${eventData.type}' to ${clients.length} clients`);
  clients = clients.filter(client => {
    try {
      if (client.res.writableEnded) return false;
      client.res.write(payload);
      return true;
    } catch (err) {
      console.error(`[SSE] Write error for client ${client.id}, removing.`, err);
      return false;
    }
  });
};

export const broadcastMenuEvent = (eventData: { type: string; restaurantId: number; item?: any; items?: any; itemId?: number }) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  console.log(`[SSE] Broadcasting menu event '${eventData.type}' to ${clients.length} clients`);
  clients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('SSE menu broadcast error:', err);
    }
  });
};

export const broadcastRestaurantEvent = (eventData: { type: string; restaurant?: any; restaurantId?: number }) => {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  console.log(`[SSE] Broadcasting restaurant event '${eventData.type}' to ${clients.length} clients`);
  clients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('SSE restaurant broadcast error:', err);
    }
  });
};

