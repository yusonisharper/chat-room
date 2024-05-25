// Controller handler to handle functionality in room page

const roomGenerator = require('../util/roomIdGenerator.js');

// Example for handle a get request at '/:roomName' endpoint.

module.exports = (roomList) => {
    function getRoom(request, response) {
        const roomID = request.params.roomID;
        const room = roomList().find(room => room.roomID === roomID);
        if (room) {
            response.render('room', { title: 'Chatroom', roomName: room.roomName, roomID: room.roomID });
        } else {
            response.status(404).send('Room not found');
        }
    }
    return {
        getRoom
    };
};