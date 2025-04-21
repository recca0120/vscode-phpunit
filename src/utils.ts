import * as net from 'net';

export async function getFreePort(): Promise<number> {
    return new Promise<number>(resolve => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const freePort = (server.address()! as net.AddressInfo).port;
            server.close();
            resolve(freePort);
        });
    });
}
