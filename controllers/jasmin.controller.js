const req = require('request');
const jasminAux = require('./../controllers/jasminAux.controller');
const hubspot = require('./../controllers/hubspot.controller');
const url_jasmin = 'https://my.jasminsoftware.com/api/252287/252287-0001/';


function getProductsFromJasmin(request, response) {
    jasminAux.getToken((res) => {
        if (res.access_token) {
            jasminAux.getProducts(res.access_token, (res) => {
                if (res.products) {
                    return response.status(200).json({
                        statusCode: 200,
                        message: res.products
                    });
                } else {
                    return response.status(400).json({
                        statusCode: 400,
                        message: res.body
                    });
                }
            });
        }
        else {
            return response.status(400).json({
                statusCode: 400,
                message: res.body
            });
        }
    });
}


function makeOrder(request, response) {
    const email = request.body.email;
    const produtos = request.body.produtos;
    const quantidade = request.body.quantidade;
    const valorEncomenda = parseFloat(request.body.valor);

    jasminAux.getInvoiceType((res) => {
        if (res.invoiceType) {
            const invoiceType = res.invoiceType;
            const access_token = res.access_token;

            jasminAux.getProducts(access_token, (res) => {
                if (res.products) {

                    let product;
                    let productSold = [];
                    var arrayProdutos = produtos.split("|"); //array guarda produtos
                    var arrayQuantProdutos = quantidade.split("|"); //array guarda quantidade produto

                    for (let i = 0; i < arrayProdutos.length; i++) {

                        for (let j = 0; j < res.products.length; j++) {
                            if (res.products[j].itemKey == arrayProdutos[i]) {
                                product = res.products[j];

                                if (product) {
                                    productSold.push({
                                        'salesItem': product.itemKey,
                                        'description': product.description,
                                        'quantity': arrayQuantProdutos[i],
                                        'unitPrice': product.priceListLines[0].priceAmount,
                                        'unit': product.priceListLines[0].unit,
                                        'itemTaxSchema': product.itemTaxSchema,
                                        'deliveryDate': new Date().toISOString()
                                    })
                                }
                                else {

                                }
                            }
                            else {

                            }
                        }
                    }
                    jasminAux.checkUser(email, access_token, (res) => {
                        if (res.statusCode == 200) {
                            if (res.body.length == 0) {

                                jasminAux.insertClient(email, access_token, (res) => {
                                    if (res.statusCode == 200) {
                                        const user = res.body;

                                        if (productSold.length != 0) {
                                            let json = {
                                                'documentType': 'FR',  //tipo de documento - fatura recibo
                                                'serie': invoiceType.serie, //serie da fatura  - (faturas do ano x)
                                                'seriesNumber': invoiceType.currentNumber, //chave da série
                                                'company': 'WF', //empresa 
                                                'paymentTerm': '00', //pronto pagamento
                                                'paymentMethod': 'MB', //metodo pagamento - multi banco
                                                'currency': 'EUR', //moeda
                                                'documentDate': new Date().toISOString(), //data de instanciamento
                                                'postingDate': new Date().toISOString(), // data de criação
                                                'buyerCustomerParty': user.partyKey, //id client associado a compra
                                                'buyerCustomerPartyName': user.name, //nome client
                                                'buyerCustomerPartyTaxId': user.companyTaxID, //nif client
                                                'exchangeRate': 1,
                                                'discount': 0, //percentagem
                                                'loadingCountry': 'PT', //pais venda
                                                'unloadingCountry': 'PT', //pais compra
                                                'financialAccount': '01', //conta 01
                                                'isExternal': false,
                                                'isManual': false,
                                                'isSimpleInvoice': false,
                                                'isWsCommunicable': false,
                                                'deliveryTerm': 'NA', //termo de entrega - nao aplicavel
                                                'documentLines': productSold,
                                                'WTaxTotal': { //total taxas
                                                    'amount': 0,
                                                    'baseAmount': 0,
                                                    'reportingAmount': 0,
                                                    'fractionDigits': 2,
                                                    'symbol': '€'
                                                },
                                                'TotalLiability': { //preco liquido (livre de taxas)
                                                    'baseAmount': 0,
                                                    'reportingAmount': 0,
                                                    'fractionDigits': 2,
                                                    'symbol': '€'
                                                }
                                            }

                                            let options = {
                                                headers: {
                                                    'Authorization': `Bearer ${access_token}`,
                                                    'Content-Type': 'application/json; charset=utf-8',
                                                    'Content-Length': JSON.stringify(json).length
                                                },
                                                url: `${url_jasmin}billing/invoices`,
                                                body: JSON.stringify(json)
                                            }

                                            req.post(options, (err, res) => {
                                                const idFatura = res.body;
                                                if (!err && res.statusCode == 201) {
                                                    hubspot.updateClient(email, valorEncomenda, (res) => {
                                                        if (res.statusCode == 200) {
                                                            console.log(valorEncomenda);

                                                            jasminAux.getFatura(access_token, idFatura, (res) => {
                                                                if (res.statusCode == 200) {
                                                                    const pdf = res.body;

                                                                    jasminAux.sendFatura(email, pdf);
                                                                    return response.status(200).json({
                                                                        message: 'success'
                                                                    });
                                                                }
                                                                else {
                                                                    return response.status(400).json({
                                                                        message: res.body
                                                                    });
                                                                }
                                                            })
                                                        }
                                                        else {
                                                            return response.status(400).json({
                                                                message: res.body
                                                            });
                                                        }
                                                    })

                                                }
                                                else {
                                                    return response.status(400).json({
                                                        message: res.body
                                                    });
                                                }
                                            })
                                        }
                                    }
                                    else {
                                        return response.status(400).json({
                                            message: res.body
                                        });
                                    }
                                })
                            }
                            else {
                                const user = res.body[0];

                                if (productSold.length != 0) {
                                    let json = {
                                        'documentType': 'FR',  //tipo de documento - fatura recibo
                                        'serie': invoiceType.serie, //serie da fatura  - (faturas do ano x)
                                        'seriesNumber': invoiceType.currentNumber, //chave da série
                                        'company': 'WF', //empresa 
                                        'paymentTerm': '00', //pronto pagamento
                                        'paymentMethod': 'MB', //metodo pagamento - multi banco
                                        'currency': 'EUR', //moeda
                                        'documentDate': new Date().toISOString(), //data de instanciamento
                                        'postingDate': new Date().toISOString(), // data de criação
                                        'buyerCustomerParty': user.partyKey, //id client associado a compra
                                        'buyerCustomerPartyName': user.name, //nome client
                                        'buyerCustomerPartyTaxId': user.companyTaxID, //nif client
                                        'exchangeRate': 1,
                                        'discount': 0, //percentagem
                                        'loadingCountry': 'PT', //pais venda
                                        'unloadingCountry': 'PT', //pais compra
                                        'financialAccount': '01', //conta 01
                                        'isExternal': false,
                                        'isManual': false,
                                        'isSimpleInvoice': false,
                                        'isWsCommunicable': false,
                                        'deliveryTerm': 'NA', //termo de entrega - nao aplicavel
                                        'documentLines': productSold,
                                        'WTaxTotal': { //total taxas
                                            'amount': 0,
                                            'baseAmount': 0,
                                            'reportingAmount': 0,
                                            'fractionDigits': 2,
                                            'symbol': '€'
                                        },
                                        'TotalLiability': { //preco liquido (livre de taxas)
                                            'baseAmount': 0,
                                            'reportingAmount': 0,
                                            'fractionDigits': 2,
                                            'symbol': '€'
                                        }
                                    }

                                    let options = {
                                        headers: {
                                            'Authorization': `Bearer ${access_token}`,
                                            'Content-Type': 'application/json; charset=utf-8',
                                            'Content-Length': JSON.stringify(json).length
                                        },
                                        url: `${url_jasmin}billing/invoices`,
                                        body: JSON.stringify(json)
                                    }

                                    req.post(options, (err, res) => {
                                        const idFatura = res.body;
                                        if (!err && res.statusCode == 201) {
                                            hubspot.updateClient(email, valorEncomenda, (res) => {
                                                if (res.statusCode == 200) {

                                                    jasminAux.getFatura(access_token, idFatura, (res) => {
                                                        if (res.statusCode == 200) {
                                                            const pdf = res.body;

                                                            jasminAux.sendFatura(email, pdf);
                                                            return response.status(200).json({
                                                                message: 'success'
                                                            });
                                                        }
                                                        else {
                                                            return response.status(400).json({
                                                                message: res.body
                                                            });
                                                        }
                                                    })
                                                }
                                                else {
                                                    return response.status(400).json({
                                                        message: res.body
                                                    });
                                                }
                                            })

                                        }
                                        else {
                                            return response.status(400).json({
                                                message: res.body
                                            });
                                        }
                                    })
                                }
                            }
                        }
                        else {
                            return response.status(400).json({
                                message: res.body
                            });
                        }
                    })
                }
                else {
                    callback({
                        'statusCode': res.statusCode,
                        'body': res.body
                    })
                }
            })
        }
        else {
            callback({
                'statusCode': res.statusCode,
                'body': res.body
            })
        }
    })
}


module.exports = {
    getProductsFromJasmin: getProductsFromJasmin,
    makeOrder: makeOrder
}