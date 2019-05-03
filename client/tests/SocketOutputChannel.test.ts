describe('socket output channel', () => {
    it('', () => {});
});
// import { SocketOutputChannel } from '../src/socketOutputChannel';
// import * as WebSocket from 'ws';

// describe('socket output channel', () => {
//     let outputChannel: any;
//     let socketOutputChannel: SocketOutputChannel;

//     beforeEach(() => {
//         outputChannel = {
//             append: () => {},
//             appendLine: () => {},
//             clear: () => {},
//             show: () => {},
//             hide: () => {},
//             dispose: () => {},
//         };
//         socketOutputChannel = new SocketOutputChannel(outputChannel, 7000);
//     });

//     it('socket append line', () => {
//         const socket: any = {
//             readyState: WebSocket.OPEN,
//             send: () => {},
//         };

//         spyOn(socket, 'send');

//         socketOutputChannel.setSocket(socket).listen();
//         socketOutputChannel.append('hello ');
//         socketOutputChannel.appendLine('world');

//         expect(socket.send).toBeCalledWith('hello world');
//     });

//     it('clear', () => {
//         spyOn(outputChannel, 'clear');

//         socketOutputChannel.clear();

//         expect(outputChannel.clear).toBeCalled();
//     });

//     it('show', () => {
//         spyOn(outputChannel, 'show');

//         socketOutputChannel.show('foo');

//         expect(outputChannel.show).toBeCalledWith('foo');
//     });

//     it('hide', () => {
//         spyOn(outputChannel, 'hide');

//         socketOutputChannel.hide();

//         expect(outputChannel.hide).toBeCalled();
//     });

//     it('dispose', () => {
//         spyOn(outputChannel, 'dispose');

//         socketOutputChannel.dispose();

//         expect(outputChannel.dispose).toBeCalled();
//     });
// });
