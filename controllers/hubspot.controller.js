const Hubspot = require('hubspot');
const req = require('request');
var sanitizer = require('sanitize')();
const Key = 'ada6fa57-545c-40ce-a500-b6dfb10017fc';

function createClient(request, response) {
    const firstname =  request.body.nome;
    const lastname = request.body.sobrenome;
    const username = request.body.username;
    const email = request.body.email;
    const nif = request.body.nif;
    const endereco = request.body.endereco;
    const numerotelefone = request.body.numerotelefone;

    const properties = [{
        property: 'firstname',
        value: firstname
    }, {
        property: 'lastname',
        value: lastname
    }, {
        property: 'Username',
        value: username
    }, {
        property: 'email',
        value: email
    }, {
        property: "NIF",
        value: nif
    }, {
        property: 'phone',
        value: numerotelefone
    }, {
        property: 'address',
        value: endereco
    }, {
        property: 'valortotalgasto',
        value: 0
    }, {
        property: 'numeroencomendas',
        value: 0
    }];

    let json = {
        'properties': properties
    };
    
    console.log(json);

    let options = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        url: `https://api.hubapi.com/contacts/v1/contact/?hapikey=${Key}`,
        body: JSON.stringify(json)
    }
    req.post(options, (err, res) => {
        if (!err && res.statusCode == 200) {
            return response.status(200).json({
                message: "success"
            });
        } else {
            return response.status(400).json({
                error: res.body  
            });
        }
    })
}

function updateClient(request, response) {

    const valorEncomenda =  parseFloat(request.body.valorEncomenda);
    const email = request.body.email;


    let options = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        url: `https://api.hubapi.com/contacts/v1/contact/email/${email}/profile?hapikey=${Key}`,
    }

    req.get(options, (err, res) => {
        if (!err && res.statusCode == 200) {
            
            const body = JSON.parse(res.body).properties;
            let valortotalgasto = parseFloat(body.valortotalgasto.value);
            let numeroencomendas = parseInt(body.numeroencomendas.value);
            
            valortotalgasto += valorEncomenda;
            numeroencomendas += 1;

            const properties = [{
                property: 'valortotalgasto',
                value: valortotalgasto
            }, {
                property: 'numeroencomendas',
                value: numeroencomendas
            }];

            let json = {
                'properties': properties
            };

            let options1 = {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
            },
                url: `https://api.hubapi.com/contacts/v1/contact/email/${email}/profile?hapikey=${Key}`,
                body: JSON.stringify(json)
            }

            req.post(options1, (err1, res1) => {
                if (!err1 && res1.statusCode == 204) {
                    return response.status(200).json({
                        message: "success"
                    });
                } else {
                    return response.status(400).json({
                        error: res.body
                    });
                }
            })
        } else {
            return response.status(400).json({
                error: res.body
            });
        }
    })
}

function createTicket(request, response) {

    const titulo =  request.body.titulo;
    const texto = request.body.texto;
    const email = request.body.email;

    const properties = [{
        name: 'subject',
        value: titulo
    }, {
        name: 'content',
        value: texto
    }, {
        name: 'hs_pipeline',
        value: '0'
    },{
        name: 'hs_pipeline_stage',
        value: '1'
    }];

    let options = {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        url: `https://api.hubapi.com/crm-objects/v1/objects/tickets?hapikey=${Key}`,
        body: JSON.stringify(properties)
    }

    req.post(options, (err, res) => {
        if (!err && res.statusCode == 200) {

            const ticket = JSON.parse(res.body);
            const ticketID = ticket.objectId;

            let options0 = {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                url: `https://api.hubapi.com/contacts/v1/contact/email/${email}/profile?hapikey=${Key}`,
                //body: JSON.stringify(json)
            }
        
            req.get(options0, (err0, res0) => {
                if (!err0 && res0.statusCode == 200) {
                    
                    const client = JSON.parse(res0.body);
                    const id = client.vid;
        
                    //Contact to Ticket
                    const properties1 = {
                        'fromObjectId' : ticketID,
                        'toObjectId' : id,
                        'category' : 'HUBSPOT_DEFINED',
                        'definitionId': 16
                      };

                    let options1 = {
                        headers: {
                            'Content-Type': 'application/json; charset=utf-8'
                    },
                        url: `https://api.hubapi.com/crm-associations/v1/associations?hapikey=${Key}`,
                        body: JSON.stringify(properties1)
                    }
        
                    req.put(options1, (err1, res1) => {
                        if (!err1 && (res1.statusCode == 204)) {
                            return response.status(200).json({
                                message: "success"
                            });
                        } else {
                            return response.status(400).json({
                                error: res1
                            });
                        }
                    })
                } else {
                    return response.status(400).json({
                        error: res0.body
                    });
                }
            })
        } else {
            return response.status(400).json({
                error: res.body
            });
        }
    })
}

module.exports = {
    createClient: createClient,
    updateClient: updateClient,
    createTicket: createTicket
};