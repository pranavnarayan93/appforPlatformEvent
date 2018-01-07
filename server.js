let nforce = require('nforce');
let faye = require('faye');
let express = require('express');
let cors = require('cors');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

let getRooms = (req, res) => {
    let q = "SELECT Id, Name, Floor__c,Room_Type__c,Max_number_of_People_in_the_room__c,No_of_people_Staying__c FROM Room__c ORDER BY NAME";
    org.query({query: q}, (err, resp) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        } else {
            let rooms = resp.records;
            let prettyRooms = [];
            rooms.forEach(room => {
                prettyRooms.push({
                    Id: room.get("Id"),
                    Name: room.get("Name"),
                    Floor__c: room.get("Floor__c"),
                    Room_Type__c: room.get("Room_Type__c"),
                    Max_number_of_People_in_the_room__c: room.get("Max_number_of_People_in_the_room__c"),
                    No_of_people_Staying__c: room.get("No_of_people_Staying__c")
                });
            });
            res.json(prettyRooms);
        }
    });

};

let getRoomDetails = (req, res) => {
    let roomId = req.params.roomId;
    console.log('roomId',roomId);
    let q = "SELECT Id,Address__c,Advance_Given__c,Age__c,Alternate_Contact_Name__c,Alternate_Contact_Phone_Number__c,Email__c,"+
            "Name__c,Phone_Number__c,Proof_Submitted__c,Rent__c,Room__r.Name,Still_Staying__c FROM Tenant__c "+ 
            "WHERE Room__c = '" + roomId + "' AND Still_Staying__c = true";
    org.query({query: q}, (err, resp) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        } else {
            let tenants = resp.records;
            let prettyTenants = [];
            tenants.forEach(tenant => {
                prettyTenants.push({
                    Id : tenant.get('Id'),
                    Address__c: tenant.get('Address__c'),
                    Advance_Given__c:  tenant.get('Advance_Given__c'),
                    Age__c: tenant.get('Age__c'),
                    Alternate_Contact_Name__c: tenant.get('Alternate_Contact_Name__c'),
                    Alternate_Contact_Phone_Number__c:  tenant.get('Alternate_Contact_Phone_Number__c'),
                    Email__c: tenant.get("Email__c"),
                    Name__c: tenant.get('Name__c'),
                    Phone_Number__c: tenant.get('Phone_Number__c'),
                    Proof_Submitted__c: tenant.get('Proof_Submitted__c'),
                    Rent__c: tenant.get('Rent__c'),
                    Room__c:tenant.get("Room__r").Name,
                    Still_Staying__c:tenant.get("Still_Staying__c")
                });
            });
            res.json(prettyTenants);
        }
    });

};

let vacateTenant = (req, res) => {
    let tenantId = req.params.tenantId;
    let event = nforce.createSObject('Room_Vacated__e');
    event.set('Tenant_Id__c', tenantId);
    org.insert({sobject: event}, err => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        } else {
            res.sendStatus(200);
        }
    });
}

let PORT = process.env.PORT || 5000;

app.use(cors());
app.use('/', express.static(__dirname + '/www'));
app.get('/rooms', getRooms);
app.get('/rooms/:roomId', getRoomDetails);
app.post('/vacate/:tenantId', vacateTenant);


let bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
bayeux.attach(server);
bayeux.on('disconnect', function(clientId) {
    console.log('Bayeux server disconnect');
});

server.listen(PORT, () => console.log(`Express server listening on ${ PORT }`));

// Connect to Salesforce
//et SF_CLIENT_ID = process.env.SF_CLIENT_ID;
let SF_CLIENT_ID = '3MVG9ZL0ppGP5UrB0maUIwCyBA2hRpAaABPW6Q_mZQBftz.iJF4w.AONW.XF3T_mlhvpl4SiYexTzkgFUTQf9';
//let SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
let SF_CLIENT_SECRET = '3326889229794377836';
//let SF_USER_NAME = process.env.SF_USER_NAME;
let SF_USER_NAME = 'pranav@narayan.com';
//let SF_USER_PASSWORD = process.env.SF_USER_PASSWORD;
let SF_USER_PASSWORD = 'Lister_1234Ssc8bvCHgYZwKM9a0Uk6bUBWO';

let org = nforce.createConnection({
    clientId: SF_CLIENT_ID,
    clientSecret: SF_CLIENT_SECRET,
    environment: "production",
    redirectUri: 'http://localhost:3000/oauth/_callback',
    mode: 'single',
    autoRefresh: true
});

org.authenticate({username: SF_USER_NAME, password: SF_USER_PASSWORD}, err => {
    if (err) {
        console.error("Salesforce authentication error");
        console.error(err);
    } else {
        console.log("Salesforce authentication successful");
        console.log(org.oauth.instance_url);        
        subscribeToPlatformEvents();
    }
});

// Subscribe to Platform Events
let subscribeToPlatformEvents = () => {
    var client = new faye.Client(org.oauth.instance_url + '/cometd/40.0/');
    client.setHeader('Authorization', 'OAuth ' + org.oauth.access_token);
    client.subscribe('/event/Room_Created__e', function(message) {
        // Send message to all connected Socket.io clients
        io.of('/').emit('room_submitted', {
            Id: message.payload.RoomId__c,
            Name : message.payload.Room_Name__c,
            Floor__c: message.payload.Floor__c,
            Max_number_of_People_in_the_room__c: message.payload.Max_staying__c,
            No_of_people_Staying__c : message.payload.No_of_people_Staying__c,
            Room_Type__c : message.payload.Room_Type__c
        });
    });
    /*client.subscribe('/event/Mix_Unsubmitted__e', function(message) {
        // Send message to all connected Socket.io clients
        io.of('/').emit('mix_unsubmitted', {
            mixId: message.payload.Mix_Id__c,
        });
    });*/
};