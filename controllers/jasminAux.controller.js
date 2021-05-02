const req = require('request');
const hubspotController = require('./../controllers/hubspot.controller');
const url_jasmin = 'https://my.jasminsoftware.com/api/252287/252287-0001/';
const querystring = require('querystring');
const nodemailer = require('nodemailer');

//insere cliente no jasmin quando este efetua uma compra
function insertClient(email, access_token, callback) {
    hubspotController.getClientByEmail(email, (res1) => {
        if (res1.user) {
            const json = {
                "name": res1.user.nome,
                "electronicMail": res1.user.email,
                "companyTaxID": res1.user.nif,
                "isExternallyManaged": false,
                "currency": "EUR",
                "isPerson": true,
                "country": "PT"
            };

            let options = {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': JSON.stringify(json).length
                },
                url: `${url_jasmin}salescore/customerParties`,
                body: JSON.stringify(json)
            }

            req.post(options, (err, res) => {
                if (!err && res.statusCode == 201) {
                    const record_id = JSON.parse(res.body);

                    options = {
                        headers: {
                            'Authorization': `Bearer ${access_token}`
                        },
                        url: `${url_jasmin}salescore/customerParties/${record_id}`
                    }
                    req.get(options, (err, res) => {
                        if (!err && res.statusCode == 200) {
                            callback({
                                'statusCode': res.statusCode,
                                'body': {
                                    customer_id: JSON.parse(res.body)
                                }
                            })
                        } else {
                            callback({
                                'statusCode': res.statusCode,
                                'body': res.body
                            })
                        }
                    })
                } else {
                    callback({
                        'statusCode': res.statusCode,
                        'body': res.body
                    })
                }
            })
        }
    })
}

//verifica que o user ja existe no jasmin atraves de comparação com o seu eamil 
//no hubspot, evitando multiplos registos referentes ao mesmo user
function checkUser(email, access_token, callback) {
    hubspotController.getClientByEmail(email, (res1) => {
        if (res1.user) {

            let options = {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                },
                url: `${url_jasmin}salesCore/customerParties/odata?$filter=CompanyTaxID eq '${res1.user.nif}'`
            }

            req.get(options, (err, res) => {
                if (!err && res.statusCode == 200) {
                    const items = JSON.parse(res.body).items;
                    callback({
                        'statusCode': res.statusCode,
                        'body': items
                    })
                } else {
                    callback({
                        'statusCode': res.statusCode,
                        'body': res.body
                    })
                }
            })
        }
    })
}


function getInvoiceType(callback) {
    getToken((res) => {
        if (res.access_token) {
            const access_token = res.access_token;

            let options = {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                },
                url: `${url_jasmin}salesCore/invoiceTypes`
            }
            req.get(options, (err, res) => {
                if (!err && res.statusCode == 200) {
                    let response = JSON.parse(res.body);
                    let invoiceType;
                    for (let j = 0; j < response.length; j++) {
                        if (response[j].company == 'WF' && response[j].typeKey == 'FR') {
                            invoiceType = response[j];
                        }
                    }
                    callback({
                        'invoiceType': invoiceType.documentTypeSeries[0],
                        'access_token': access_token
                    });
                } else {
                    callback({
                        'statusCode': res.statusCode,
                        'body': JSON.parse(res.body)
                    });
                }
            })
        }
    })
}

//retorna os produtos disponiveis para venda na conta 
//associada ao pedido com access token "x"
function getProducts(access_token, callback) {

    let options = {
        headers: {
            'Authorization': `Bearer ${access_token}`
        },
        url: `${url_jasmin}salesCore/salesItems`
    }
    req.get(options, (err, res) => {
        if (!err && res.statusCode == 200) {
            let response = JSON.parse(res.body);
            callback({
                'products': response
            });
        } else {
            callback({
                'statusCode': res.statusCode,
                'body': JSON.parse(res.body)
            });
        }
    })
}


function getToken(callback) {
    let json = querystring.stringify({
        client_id: 'webfarm',
        client_secret: '1da3cf5c-184c-4dc5-adff-461d2b3e2239',
        grant_type: 'client_credentials',
        scope: 'application'
    });

    let options = {
        headers: {
            'Content-Length': json.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        url: `https://identity.primaverabss.com/core/connect/token`,
        body: json
    }
    req.post(options, (err, res) => {
        if (!err && res.statusCode == 200) {
            callback({
                'access_token': JSON.parse(res.body).access_token
            });
        } else {
            callback({
                'statusCode': res.statusCode,
                'body': JSON.parse(res.body)
            });
        }
    })
}


function getFatura(access_token, idFatura, callback) {
    const id = idFatura.replace(/['"]+/g, '');
    let options = {
        headers: {
            'Authorization': `Bearer ${access_token}`,
            //'Content-Type': 'application/octet-stream'
        },
        encoding: null,
        url: `${url_jasmin}/billing/invoices/${id}/printOriginal`
    }
    req.get(options, (err, res) => {
        if (!err && res.statusCode == 200) {
            console.log(res.body);
            callback({
                'statusCode': res.statusCode,
                'body': res.body
            });
        } else {
            callback({
                'statusCode': res.statusCode,
                'body': JSON.parse(res.body)
            });
        }
    })
}


function sendFatura(email, pdf) {
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'webfarm21@gmail.com',
            pass: 'Webfarm2021'
        }
    });

    var data = new Date();
    var hora = data.getHours();
    let saudacao;

    if (hora >= 7 && hora <= 12) {
        saudacao = "Bom dia.";
    }
    if (hora >= 13 && hora <= 20) {
        saudacao = "Boa Tarde.";
    }
    if (hora >= 21 && hora <= 23 || (hora >= 0 && hora <= 6)) {
        saudacao = "Boa Noite.";
    }
    var mensagemResultado = "Fatura Comprovativa de Compra na Webfarm.\n";
    mensagemResultado += "Segue em baixo a fatura da sua compra efetuada na plataforma Webfarm.\n"

    var text = saudacao + mensagemResultado;

    var mailOptions = {
        from: 'webfarm21@gmail.com', // email emissor
        to: email, // lista de recetores
        subject: 'Fatura Comprovativa de aquisição de produto - Jasmin',
        text: text,
        attachments: [
            {
                filename: 'Comprovativo.pdf',
                content: pdf,
                encoding: 'data:application/octet-stream'
            }
        ]
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Message sent: ' + info.response);
        };
    });

}


module.exports = {
    insertClient: insertClient,
    checkUser: checkUser,
    getInvoiceType: getInvoiceType,
    getProducts: getProducts,
    getToken: getToken,
    getFatura: getFatura,
    sendFatura: sendFatura
};
