var content = document.getElementById('content');
var rooms;

function renderOppList() {
    var html = '';
    rooms.forEach(function(room) {
        html = html + '<div class="row">' + renderRoom(room) + '</div>';
    });
    content.innerHTML = html;
}

function renderRoom(room, isAnimated) {
    return `
        <div class="col-sm-12" id="allDetails-${room.Id}">
            <div class="panel panel-primary ${isAnimated?"animateIn":""}">
                <div class="panel-heading">Room Name: ${room.Name}</div>
                <div class="panel-body">
                    <div class="col-md-12 col-lg-7">
                        <table >
                            <tr>
                                <td class="panel-table-label">Floor:</td><td>${room.Floor__c}</td>
                            </tr>
                            <tr>
                                <td class="panel-table-label">Room Type:</td><td>${room.Room_Type__c}</td>
                            </tr>
                            <tr>
                                <td class="panel-table-label">Max Allowed:</td><td>${room.Max_number_of_People_in_the_room__c}</td>
                            </tr>
                            <tr>
                                <td class="panel-table-label">No staying:</td><td>${room.No_of_people_Staying__c}</td>
                            </tr>
                        </table>
                    </div>   
                    <div class="col-md-12 col-lg-5">
                        <button class="btn btn-info" style="float: right" onclick="getRoomDetails('${room.Id}')">
                            <span class="glyphicon glyphicon-zoom-in" aria-hidden="true"></span>
                            View Details
                        </button>
                    </div>
                    <div id="details-${room.Id}" class="col-md-12"></div>
                </div>
            </div>
        </div>`;
}

// Render the merchandise list for a room
function renderOppDetails(room, tenants,roomId) {
    var html = `
        <table class="table table table-bordered">
            <tr>
                <th >Name</th>
                <th>Advance Given</th>
                <th>Age</th>
                <th>Email</th>
                <th>Phone Number</th>
                <th>Proof Submitted</th>
                <th>Rent</th>
                <th>Still Staying</th>
                <th>Vacate Room</th>
            </tr>`;
    tenants.forEach(function(tenant) {
        html = html + `
            <tr>
                <td>${tenant.Name__c}</td>
                <td>${tenant.Advance_Given__c}</td>
                <td>${tenant.Age__c}</td>
                <td style="word-break: break-all;">${tenant.Email__c}</td>
                <td>${tenant.Phone_Number__c}</td>
                <td><input type="checkbox" disabled="true" checked="${tenant.Proof_Submitted__c}"></td>
                <td>${tenant.Rent__c}</td>
                <td>${tenant.Still_Staying__c}</td>
                <td>
                    <button class="btn btn-info" onclick="vacateRoom('${tenant.Id}')">
                            <span class="glyphicon glyphicon-ok" aria-hidden="true"></span>
                            Vacate
                </button></td>
            </tr>`
        });
    html = html + "</table>"    
    var details = document.getElementById('details-' + roomId);
    details.innerHTML = html;
}

function deleteOpp(roomId) {
    var index = rooms.length - 1;
    while (index >= 0) {
        if (rooms[index].roomId === roomId) {
            rooms.splice(index, 1);
        }
        index -= 1;
    }
}

var socket = io.connect();

socket.on('room_submitted', function (newroom) {
    // if the room is alresdy in the list: do nothing
    console.log('room submitted',newroom);
    var exists = false;
    rooms.forEach((room) => {
        if (room.Id == newroom.Id) {
            exists = true;
            console.log('exists');
            room.Floor__c = newroom.Floor__c;
            room.Max_number_of_People_in_the_room__c = newroom.Max_number_of_People_in_the_room__c;
            room.No_of_people_Staying__c = newroom.No_of_people_Staying__c;
            room.Room_Type__c = newroom.Room_Type__c;
            var el = document.getElementById('allDetails-'+room.Id);
            el.innerHTML = "";
            el.innerHTML = renderRoom(newroom, true);
        }
    });
    // if the room is not in the list: add it
    if (!exists) {
        rooms.push(newroom);
        var el = document.createElement("div");
        el.className = "row";
        el.innerHTML = renderRoom(newroom, true);
        content.insertBefore(el, content.firstChild);
    }
});

socket.on('room_unsubmitted', function (data) {
    deleteOpp(data.roomId);
    renderOppList();
});

// Retrieve the existing list of rooms from Node server
function getRoomList() {
    var xhr = new XMLHttpRequest(),
        method = 'GET',
        url = '/rooms';

    xhr.open(method, url, true);
    xhr.onload = function () {
        rooms = JSON.parse(xhr.responseText);
        renderOppList();
    };
    xhr.send();
}

// Retrieve the merchandise list for a room from Node server
function getRoomDetails(roomId) {
    console.log('roomId',roomId);
    var details = document.getElementById('details-' + roomId);
    if (details.innerHTML != '') {
        details.innerHTML = '';
        return;
    }
    var room;
    for (var i=0; i<rooms.length; i++) {
        if (rooms[i].roomId = roomId) {
            room = rooms[i];
            break;
        }
    };
    var xhr = new XMLHttpRequest(),
        method = 'GET',
        url = '/rooms/' + roomId;

    xhr.open(method, url, true);
    xhr.onload = function () {
        var items = JSON.parse(xhr.responseText);
        renderOppDetails(room, items,roomId);
    };
    xhr.send();
}

// Post approve message to Node server
function vacateRoom(tenant) {
    console.log(tenant);
    var xhr = new XMLHttpRequest(),
        method = 'POST',
        url = '/vacate/' + tenant;

    xhr.open(method, url, true);
    xhr.onload = function () {
        console.log(xhr.response);
        renderOppList();
    };
    xhr.send();
}
