/**
 * LeadIS Consulting
 * Autor: Juan Guillermo Gómez
 * Modificado por: Jacob Cardozo, Fabio Mayorga
 * Fecha: 21/06/2017
 * Ultima modificacion: 20 08 2018
 * Functions en firebase para generar el excel de los datos de los usuario
 */

 'use strict';


// Se importa los modulos necesarios
//const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const os = require('os');
const fs = require('fs');
const path = require('path');
const excel = require('exceljs');
const uuidv1 = require('uuid/v1');

//firebase functions:config:set confbucket.name="fptc-dev.appspot.com"
//const URL_BUCKET = 'fptc-dev.appspot.com';
const PROJECT_ID = 'amate-b8ceb';
const KEY_FILE_NAME = 'api/credentials/serviceAccountKey.json';
const URL_BUCKET = 'amate-b8ceb.appspot.com';
const DB_URL = "https://amate-b8ceb.firebaseio.com";

const gcs = require('@google-cloud/storage')({
    projectId: PROJECT_ID,
    keyFilename: KEY_FILE_NAME
}
);

const bucket = gcs.bucket(URL_BUCKET);

const serviceAccount = require("../credentials/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: DB_URL
});

exports.generateUserDataFile = (req, resp) => {

    cors(req, resp, () => {

        // Se valida que solo se acepte peticiones GET
        if (req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST') {
            resp.status(403).send('Forbidden!');
        }

        if (req.query.userName === undefined ||
            req.query.userName === '' ||
            req.query.userName === null) {
            return resp.status(500).json({ "responseCode": 500, "responseError": "Nombre del usuario no es valido" });
    }

    if (req.query.date === undefined ||
        req.query.date === '' ||
        req.query.date === null) {
        return resp.status(500).json({ "responseCode": 500, "responseError": "La Fecha no es valida" });
}

const userName = req.query.userName;
const date = req.query.date;

const nameFile = uuidv1();

        // Se consultan todas la preguntas de cervix y mama
        let questionsBreast = admin.database().ref(`preguntas/breastCancer/`)
        .once("value").then(preguntas => { return preguntas });

        let questionsCervix = admin.database().ref(`preguntas/cervixCancer/`)
        .once("value").then(preguntas => { return preguntas });

        // Se consultan todos los usuarios


        //consulta usuario test development let users = admin.database().ref(`usuarios`).orderByChild("email").equalTo("development@amate.com").once("value").then(usuarios => { return usuarios });

        let users = admin.database().ref(`usuarios`).once("value").then(usuarios => { return usuarios });
        //let users = admin.database().ref(`usuarios`).orderByChild("email").equalTo("development@amate.com").once("value").then(usuarios => { return usuarios });

        // Se consultan datos de la configuración
        let configuration = admin.database().ref(`configuracion/`)
        .once("value").then(configuration => { return configuration });

        Promise.all([questionsBreast, users, configuration, questionsCervix]).then(data => {

            var workbook = new excel.Workbook();

            let sheet1 = workbook.addWorksheet('data');
            let sheet2 = workbook.addWorksheet('answers');

            let questionsTMPBreast = data[0];
            let questionsTMPCervix = data[3];

            // Se crean las cabeceras del excel
            sheet1.columns = headers(questionsTMPBreast, questionsTMPCervix, data[2].val().numOpportunities);
            sheet2.columns = headersAnswers();

            // Se llama la promesa para llenar las preguntas
            console.log("arranco a generar el documento");
            fillAnswersText(questionsTMPBreast, questionsTMPCervix, sheet2);

            // Se convierten las preguntas a un array para facilitar su procesamiento
            questionsTMPBreast = convertQuestionArray(questionsTMPBreast);
            questionsTMPCervix = convertQuestionArray(questionsTMPCervix);

            let usersTMP = data[1];

            var rows = [];

            var promisesUsers = [];

            let uids = Object.keys( usersTMP.val() )

            let contador = 0;



            // Se itera por cada usuario y se crea una promesa por sus respuestas
            usersTMP.forEach(usuario => {

                let tmpuid = uids[contador];

                let row = "";
                row = `{"uid": "${tmpuid}"`;

                contador++;


                
                if (usuario.val().dateCreated != undefined ) {
                    row += `,"dateCreated": "${usuario.val().dateCreated}"`;
                } 
                else {
                    row += `,"dateCreated":"Indefinido"`;
                }                   

                if (usuario.val().name != undefined) {
                    row += `, "name":"${usuario.val().name}"`;
                }

                if (usuario.val().lastName != undefined) {
                    row += `, "lastName": "${usuario.val().lastName}"`;
                }

                if (usuario.val().dateBirthday != undefined) {
                    row += `, "dateBirthday": "${usuario.val().dateBirthday}"`;
                }

                if (usuario.val().phoneNumber != undefined) {
                    row += `, "phoneNumber": "${usuario.val().phoneNumber}"`;
                }

                if (usuario.val().phoneNumberCel != undefined) {
                    row += `, "phoneNumberCel": "${usuario.val().phoneNumberCel}"`;
                }

                if (usuario.val().address != undefined) {
                    row += `, "address": "${usuario.val().address}"`;
                }

                if (usuario.val().neighborhood != undefined) {
                    row += `, "neighborhood": "${usuario.val().neighborhood}"`;
                }




                if (usuario.val().pais != undefined) {
                    row += `, "pais": "${usuario.val().pais}"`;
                }
                else{
                    row += `, "pais": "-"`;
                }

                if (usuario.val().ciudad != undefined) {
                    row += `, "ciudad": "${usuario.val().ciudad}"`;
                }
                else{
                    row += `, "ciudad": "-"`;
                }

                if (usuario.val().comuna != undefined) {
                    row += `, "comuna": "${usuario.val().comuna}"`;
                }
                else{
                    row += `, "comuna": "-"`;
                }

                if (usuario.val().ese != undefined) {
                    row += `, "ese": "${usuario.val().ese}"`;
                }
                else{
                    row += `, "ese": "-"`;
                }

                if (usuario.val().ips != undefined) {
                    row += `, "ips": "${usuario.val().ips}"`;
                }
                else{
                    row += `, "ips": "-"`;
                }






                if (usuario.val().email != undefined) {
                    row += `, "email": "${usuario.val().email}"`;
                }

                if (usuario.val().state != undefined) {
                    row += `, "state": ${usuario.val().state}`;
                }

                if ('breastIndication' in usuario.val()) {
                    let indcer = usuario.val().breastIndication == true ? true : false;
                    row += `, "breastIndication": "${indcer}"`
                }

                if ('cervixIndication' in usuario.val()) {
                    
                    let indcer = usuario.val().cervixIndication == true ? true : false;
                     row += `, "cervixIndication": "${indcer}"`
                }

                if (usuario.val().pointsCervix != undefined && usuario.val().pointsBreast != undefined) {

                    let puntuacion = usuario.val().pointsCervix + usuario.val().pointsBreast;
                    console.log(puntuacion);

                    row += `, "points": ${puntuacion}`
                }

                if (usuario.val().hasChilds != undefined && usuario.val().hasChilds != "") {
                    row += `, "hasChilds": ${usuario.val().hasChilds}`;
                }

                if (usuario.val().height != undefined && usuario.val().height != "") {
                    row += `, "height": ${usuario.val().height}`;
                }

                if (usuario.val().weight != undefined && usuario.val().weight != "") {
                    row += `, "weight": ${usuario.val().weight}`;
                }

                if (usuario.val().weight != undefined && usuario.val().weight != "" && usuario.val().height != undefined && usuario.val().height != "") {
                    row += `, "imc": "${calculateIMC(usuario.val().weight, usuario.val().height)}"`;
                }

                if (usuario.val().dateBirthday != undefined && usuario.val().dateBirthday != "") {
                    row += `, "age": "${calculateAge(usuario.val().dateBirthday)}"`;
                }

                if (usuario.val().pointsBreast != undefined && usuario.val().pointsBreast != "") {
                    row += `, "pointsBreast": "${usuario.val().pointsBreast}"`;
                }

                if (usuario.val().pointsCervix != undefined && usuario.val().pointsCervix != "") {
                    row += `, "pointsCervix": "${usuario.val().pointsCervix}"`;
                }

                if (usuario.val().dateCompletedBreast != undefined && usuario.val().dateCompletedBreast != "") {
                    row += `, "dateCompletedBreast": "${usuario.val().dateCompletedBreast}"`
                }

                if (usuario.val().dateCompletedCervix != undefined && usuario.val().dateCompletedCervix != "") {
                    row += `, "dateCompletedCervix": "${usuario.val().dateCompletedCervix}"`
                }

                if (usuario.val().profileCompleted != undefined && usuario.val().profileCompleted != "") {
                    row += `, "profileCompleted": "${usuario.val().profileCompleted}"`
                }

                if (usuario.val().repetitionsAnswersBreast != undefined && usuario.val().repetitionsAnswersBreast != "") {
                    row += `, "repetitionsAnswersBreast": "${usuario.val().repetitionsAnswersBreast}"`
                }

                if (usuario.val().repetitionsAnswersCervix != undefined && usuario.val().repetitionsAnswersCervix != "") {
                    row += `, "repetitionsAnswersCervix": "${usuario.val().repetitionsAnswersCervix}"`
                }

                let prize = 0;

                if (usuario.val().state === 3) {
                    prize = 1;
                }

                row += `, "prize": ${prize}`

            //VALIDACIONES V2 : FABIO ALBERTO MAYORGA DUARTE

            //cantidad de rondas

            if (usuario.val().repetitionsAnswersCervix != undefined && usuario.val().repetitionsAnswersBreast != "") {
                let almenosunamamo = usuario.val().repetitionsAnswersBreast >= 1 ? true : false;
                row += `, "almenosunamamo": "${almenosunamamo}"`
            }

            if (usuario.val().repetitionsAnswersCervix != undefined && usuario.val().repetitionsAnswersCervix != "") {
                let almenosunacervix = usuario.val().repetitionsAnswersCervix >= 1 ? true : false;
                row += `, "almenosunacervix": "${almenosunacervix}"`
            }

            if (usuario.val().repetitionsAnswersCervix != undefined && usuario.val().repetitionsAnswersBreast != "") {
                let dosmamografia = usuario.val().repetitionsAnswersBreast >= 2 ? true : false;
                row += `, "dosmamografia": "${dosmamografia}"`
            }

            if (usuario.val().repetitionsAnswersCervix != undefined && usuario.val().repetitionsAnswersCervix != "") {
                let doscervix = usuario.val().repetitionsAnswersCervix >= 2 ? true : false;
                row += `, "doscervix": "${doscervix}"`
            }

            //fin cantidad de rondas



            //indicacion repetida de citologia
            if ('cervixIndication' in usuario.val()) {
                let qwe = usuario.val().cervixIndication == true ? "true" : "false";
                row += `, "indicacioncitologia": "${qwe}"`
            }







            console.log("mamografia");


            let mamografiaRealizada = ``;
            //validacion mamografia realizada
            if (usuario.val().historialIndicacionesMamografia != undefined ) {

                //ahora veremos el ultimo valor. Lo separamos para hacerlo mas presentable a nivel de codigo
                let registros = Object.keys(usuario.val().historialIndicacionesMamografia);

                registros = registros[ parseInt(registros.length - 1) ];

                //el motivo 41 perteece al grupo 4: tamizado, e indica examen realizado
                if(usuario.val().historialIndicacionesMamografia[registros].idMotivo == 41 ){
                    mamografiaRealizada = true;
                }
                else{
                    mamografiaRealizada = false;
                }
                
            }
            else{ //no existe indicacion
                mamografiaRealizada = ``;
            }

            row += `, "mamografiaRealizada": "${mamografiaRealizada}"`


            console.log("citología");
            let citologiaRealizada = ``;
            if (usuario.val().historialIndicacionesCitologia != undefined ) {

                //ahora veremos el ultimo valor. Lo separamos para hacerlo mas presentable a nivel de codigo
                let registros = Object.keys(usuario.val().historialIndicacionesCitologia);

                registros = registros[ parseInt(registros.length - 1) ];

                //el motivo 41 perteece al grupo 4: tamizado, e indica examen realizado
                if(usuario.val().historialIndicacionesCitologia[registros].idMotivo == 42 ){
                    citologiaRealizada = true;
                }
                else{
                    citologiaRealizada = false;
                }
                
            }
            else{ //no existe indicacion
                citologiaRealizada = ``;
            }

            row += `, "citologiaRealizada": "${citologiaRealizada}"`


            console.log("adnvph");
            let adnvph = ``;
            if (usuario.val().historialIndicacionesCitologia != undefined ) {

                //ahora veremos el ultimo valor. Lo separamos para hacerlo mas presentable a nivel de codigo
                let registros = Object.keys(usuario.val().historialIndicacionesCitologia);

                registros = registros[ parseInt(registros.length - 1) ];

                //el motivo 41 perteece al grupo 4: tamizado, e indica examen realizado
                if(usuario.val().historialIndicacionesCitologia[registros].idMotivo == 43 ){
                    adnvph = true;
                }
                else{
                    adnvph = false;
                }
                
            }
            else{ //no existe indicacion
                adnvph = ``;
            }

            row += `, "adnvph": "${adnvph}"`

            //fin de estados

            //inicio de razones

            let razonnomamografia = ``;
            if (usuario.val().historialIndicacionesMamografia != undefined ) {

                //ahora veremos el ultimo valor. Lo separamos para hacerlo mas presentable a nivel de codigo
                let registros = Object.keys(usuario.val().historialIndicacionesMamografia);

                registros = registros[ parseInt(registros.length - 1) ];

                //el motivo 41 perteece al grupo 4: tamizado, e indica examen realizado
                if(usuario.val().historialIndicacionesMamografia[registros].idFiltro == 2 || usuario.val().historialIndicacionesMamografia[registros].idFiltro == 3  ){
                    razonnomamografia = usuario.val().historialIndicacionesMamografia[registros].idMotivo;
                }
                else{
                    razonnomamografia = `N/A`;
                }
                
            }
            else{ //no existe indicacion
                razonnomamografia = ``;
            }

            row += `, "razonnomamografia": "${razonnomamografia}"`





            let razonnocito = ``;
            if (usuario.val().historialIndicacionesCitologia != undefined ) {

                //ahora veremos el ultimo valor. Lo separamos para hacerlo mas presentable a nivel de codigo
                let registros = Object.keys(usuario.val().historialIndicacionesCitologia);

                registros = registros[ parseInt(registros.length - 1) ];

                //el motivo 41 perteece al grupo 4: tamizado, e indica examen realizado
                
                if(usuario.val().historialIndicacionesCitologia[registros].idMotivo == 42 ){
                    razonnocito = `N/A`;
                }
                else{
                    if(usuario.val().historialIndicacionesCitologia[registros].idFiltro == 2 || usuario.val().historialIndicacionesCitologia[registros].idFiltro == 3 ){
                        razonnocito = usuario.val().historialIndicacionesCitologia[registros].idMotivo;
                     }
                       else{
                            razonnocito = ``;
                    }
                }
               
                
            }
            else{ //no existe indicacion
                razonnocito = ``;
            }

            row += `, "razonnocito": "${razonnocito}"`


            //fin de razones



              console.log("indicacionadnvph y otros");

            let indicacionadnvph = ``;
            //indicacion cadnvph
            
            if (usuario.val().cervixIndication != undefined ) {

                //ahora sabiendo que la indicacion existe, validamos la edad

                let edadsifting = calculateAge(usuario.val().dateBirthday)
                

                if(usuario.val().cervixIndication == true && ( edadsifting >30 && edadsifting<65 ) ){
                    
                    let registros = "";
                    let tmpadn = "";
                    
                    if(usuario.val().historialIndicacionesCitologia != undefined){
                        
                        registros = Object.keys(usuario.val().historialIndicacionesCitologia);
                        registros = registros[ parseInt(registros.length - 1) ];
                        tmpadn = usuario.val().historialIndicacionesCitologia[registros].idMotivo;
                    }

                    indicacionadnvph = true;
                    row += `, "razonnocito": "N/A"`
                    
                    row += `, "razonnoadnvph": "${tmpadn}"`
                    
                    
                }        
                else{
                    indicacionadnvph = ``;
                    row += `, "razonnoadnvph": ""`
                }

                
            }
            else{ //no existe indicacion
                indicacionadnvph = ``;
                row += `, "razonnoadnvph": ""`
                
            }

            row += `, "indicacionadnvph": "${indicacionadnvph}"`







            promisesUsers.push(fillAnswers(questionsTMPBreast, questionsTMPCervix, 0, usuario.key, row));

            console.log("llenado de las razones temrinao");

        });

        // Se espera por todas las respuestas de todos los usuarios y las respuestas con sus textos
        Promise.all(promisesUsers).then((resultPromises) => {

            console.log("Termino todo");

            resultPromises.forEach(result => {
                sheet1.addRow(result);
                console.log("agregando filas");
            })

                // Se guarda archivo a temporales y se sube al storage
                workbook.xlsx.writeFile(path.join(os.tmpdir(), `${nameFile}.xlsx`))
                .then(function () {

                    console.log("Guardando...");

                    upload(path.join(os.tmpdir(), `${nameFile}.xlsx`), `data/${nameFile}.xlsx`, nameFile).then(downloadURL => {

                        const mb = 1048576;
                        const kb = 1024;

                            // se calcula tamaño del archivo
                            let sizeFile = fs.statSync(path.join(os.tmpdir(), `${nameFile}.xlsx`)).size;
                            sizeFile = sizeFile.toPrecision(4);
                            let textsizeFile = `${sizeFile} B`;

                            if (sizeFile >= mb) {
                                sizeFile = sizeFile / mb;
                                textsizeFile = `${sizeFile.toPrecision(4)} MB`;
                            }
                            else {
                                sizeFile = sizeFile / kb;
                                textsizeFile = `${sizeFile.toPrecision(4)} KB`;
                            }

                            admin.database().ref('datosDescarga').push().set({
                                date: date,
                                nameUser: userName,
                                size: textsizeFile,
                                urlFile: downloadURL
                            });

                            console.log("Listo guardado");

                            // se elimna archivo de temporales
                            fs.unlink(path.join(os.tmpdir(), `${nameFile}.xlsx`));

                        })
                }).catch((error) => {
                    console.log("Error generando excel => " + error);
                });

            }).catch((error) => {
                console.error("Error Promises All Users => " + error);
            });

        }).catch((error) => {
            console.error("Error => " + error);
        });


        var upload = (localFile, remoteFile, UUID) => {

            return bucket.upload(localFile, {
                destination: remoteFile,
                public: false,
                metadata: {
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    cacheControl: "public, max-age=3000",
                    firebaseStorageDownloadTokens: UUID
                }
            }).then(data => {

                let file = data[0];

                return Promise.resolve("https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + UUID);

            }).catch((error) => {
                console.error("Error Upload => " + error);
            });

        }

        return resp.status(200).json({ "response": "true" });

    });

}

function fillAnswers(questionsTMPBreast, questionsTMPCervix, index, uidUser, row) {

    return new Promise((resolve, reject) => {

        let promiseAnswersBreast =
        fillOneUserAnswers(questionsTMPBreast, index, uidUser, '', 'breastCancer');

        let promiseAnswersCervix =
        fillOneUserAnswers(questionsTMPCervix, index, uidUser, '', 'cervixCancer');

        Promise.all([promiseAnswersBreast, promiseAnswersCervix]).then(result => {

            //console.log("Termino respuestas");

            let finalRow = `${row}, ${result[0]}, ${result[1]} }`;

            if (result[0] === "" && result[1] !== "") {
                finalRow = `${row}, ${result[1]} }`;
            }

            if (result[0] !== "" && result[1] === "") {
                finalRow = `${row}, ${result[0]} }`;
            }

            if (result[0] === "" && result[1] === "") {
                finalRow = `${row} }`;
            }

            try {

                console.log(finalRow);
                console.log("es la fila");

                resolve(JSON.parse(finalRow));

                console.log("se cumple es la fila");

            } catch (error) {
                console.log("error en usuario ");
                console.error(error);
                reject(error);
            }

        }).catch((error) => {
            console.error("Error fillAnswers => " + error);
            reject(error);
        });

    });

}

function fillOneUserAnswers(questionsTMP, index, uidUser, row, typeCancer) {

    return new Promise((resolve, reject) => {

        answersRow(questionsTMP, index, uidUser, row, typeCancer);

        function answersRow(questionsTMP, index, uidUser, row, typeCancer) {

            // Preguntas
            if (questionsTMP.length > index) {

                //console.log("Llave pregunta => " + questionsTMP[index].key);

                admin.database().ref(`respuestas/${typeCancer}/${questionsTMP[index].key}`)
                .child(uidUser).once("value").then(answersUsu => {

                        //console.log(`Index cancer ${typeCancer} => ${index}`);
                        //console.log("User => " + uidUser);

                        if (answersUsu.val() != null && 'respuesta0' in answersUsu.val() && answersUsu.val().respuesta0 != null) {
                            row = row + `"${questionsTMP[index].key}_1": "${answersUsu.val().respuesta0}"`;
                            row += `, `;
                        }

                        if (answersUsu.val() != null && 'anidada0' in answersUsu.val() && answersUsu.val().anidada0 != null) {
                            row = row + `"${questionsTMP[index].key}_1_1": "${answersUsu.val().anidada0}"`;
                            row += `, `;
                        }


                        if (answersUsu.val() != null && 'respuesta1' in answersUsu.val() && answersUsu.val().respuesta1 != null) {
                            row = row + `"${questionsTMP[index].key}_2": "${answersUsu.val().respuesta1}"`;
                            row += `, `;
                        }

                        if (answersUsu.val() != null && 'anidada1' in answersUsu.val() && answersUsu.val().anidada1 != null) {
                            row = row + `"${questionsTMP[index].key}_1_2": "${answersUsu.val().anidada1}"`;
                            row += `, `;
                        }

                        index++;

                        answersRow(questionsTMP, index, uidUser, row, typeCancer);

                    }).catch((error) => {
                        console.log("Error fillOneUserAnswers => " + error);
                        reject(error);
                    });
                }
                else {

                //console.log(`Termino filas cancer ${typeCancer} => ${row}`);

                resolve(row.slice(0, -2));

            }
        }

    }

    );

}

function fillAnswersText(questionsBreast, questionsCervix, sheet2) {

    console.log("Empieza a generarse el documento de usuarios con nuevas columnas...");

    //console.log(questionsBreast);

    let row = "";


    try {

        questionsBreast.forEach(question => {

            let tmp1 = question.val().id
            let tmp2 = question.val().text

            question.child("answers").forEach(data => {                
                row = "";
                row = `{"questionID" : "${tmp1}", "questiontext" : "${tmp2}"  , "answerID":"${data.key}", "text":"${data.val().description}"}`;
                sheet2.addRow(JSON.parse(row));
                if (data.val().question) {
                    for(let answera in data.val().question.answers){
                       row = `{"questionID" : "${tmp1}", "questiontext" : "${data.val().question.text}"  ,  "answerID":"${answera}", "text":"${data.val().question.answers[answera].description}"}`;
                       sheet2.addRow(JSON.parse(row));
                   }
               }
                //console.log(row);
             //   sheet2.addRow(JSON.parse(row));
         });

        });

        questionsCervix.forEach(question => {

            let tmp1 = question.val().id
            let tmp2 = question.val().text

            question.child("answers").forEach(data => {                
                row = "";
                row = `{"questionID" : "${tmp1}", "questiontext" : "${tmp2}"  , "answerID":"${data.key}", "text":"${data.val().description}"}`;
                sheet2.addRow(JSON.parse(row));
                if (data.val().question) {
                    for(let answera in data.val().question.answers){
                        row = `{"questionID" : "${tmp1}", "questiontext" : "${data.val().question.text}"  ,  "answerID":"${answera}", "text":"${data.val().question.answers[answera].description}"}`;
                        sheet2.addRow(JSON.parse(row));
                    }
                }
                //console.log(row);
            //    sheet2.addRow(JSON.parse(row));
        });

        });


    } catch (error) {
        console.error(error);

    }

}

function convertQuestionArray(questions) {

    let questionsArray = [];

    questions.forEach(question => {
        questionsArray.push(question);
    })

    return questionsArray;

}


function headers(questionsBreast, questionsCervix, numOpportunities) {

    //console.log(questions);

    let columns = [
    { header: 'Identificador único', key: 'uid' },
    { header: 'Fecha Creación', key: 'dateCreated' },
    { header: 'Nombre', key: 'name' },
    { header: 'Apellidos', key: 'lastName' },
    { header: 'Fecha de Nacimiento', key: 'dateBirthday' },
    { header: 'Edad usuaria', key: 'age' },
    { header: 'Número fijo', key: 'phoneNumber' },
    { header: 'Celular', key: 'phoneNumberCel' },
    { header: 'Dirección', key: 'address' },
    { header: 'Barrio', key: 'neighborhood' },

    { header: 'País', key: 'pais' },
    { header: 'Ciudad', key: 'ciudad' },
    { header: 'Comuna', key: 'comuna' },
    { header: 'E.S.E', key: 'ese' },
    { header: 'I.P.S', key: 'ips' },


    { header: 'Altura', key: 'height' },
    { header: 'Peso', key: 'weight' },
    { header: 'Correo Electronico', key: 'email' },
    { header: 'Número de Hijos', key: 'hasChilds' }
    ];

    for (let i = 1; i <= numOpportunities; i++) {

        let indexQuestion = 1;
        let indexAnidada;

        questionsBreast.forEach(question => {
            indexAnidada = 1;
            columns.push({ header: `PS_${indexQuestion}_${i} ${question.val().id}`, key: `${question.key}_${i}` });
            for(let respuesta in question.val().answers){
                if(question.val().answers[respuesta].question){
                 columns.push({ header: `PSA_${indexAnidada}_${i} ${respuesta}`, key: `${question.key}_${indexAnidada}_${i}` });
                 indexAnidada++;
             }
         }
         indexQuestion++;
     });

        indexQuestion = 1;

        questionsCervix.forEach(question => {
            indexAnidada = 1;
            columns.push({ header: `PCU_${indexQuestion}_${i} ${question.val().id}`, key: `${question.key}_${i}` });
            for(let respuesta in question.val().answers){
                if( question.val().answers[respuesta].question){
                 columns.push({ header: `PCUA_${indexAnidada}_${i} ${respuesta}`, key: `${question.key}_${indexAnidada}_${i}` });
                 indexAnidada++;
             }
         }
         indexQuestion++;
     });

    }

    columns.push({ header: 'Estado', key: 'state' });
    columns.push({ header: 'Indicación Mamografía', key: 'breastIndication' });
    columns.push({ header: 'Indicación Citología', key: 'cervixIndication' });

    columns.push({ header: 'Puntuación en Mamografía', key: 'pointsBreast' });
    columns.push({ header: 'Puntuación en Citología', key: 'pointsCervix' });
    columns.push({ header: 'Fecha completado mamografía', key: 'dateCompletedBreast' });
    columns.push({ header: 'Fecha completado Citología', key: 'dateCompletedCervix' });
    columns.push({ header: 'Perfil completado', key: 'profileCompleted' });
    columns.push({ header: 'Num de repeticiones en mamografía', key: 'repetitionsAnswersBreast' });
    columns.push({ header: 'Num de repeticiones en citología', key: 'repetitionsAnswersCervix' });
    columns.push({ header: 'IMC', key: 'imc' });

    columns.push({ header: 'Puntos', key: 'points' });
    columns.push({ header: 'Premio', key: 'prize' });

    columns.push({ header: 'Al menos una ronda de Cancer de seno realizada', key: 'almenosunamamo' });
    columns.push({ header: 'Al menos una ronda de Cancer de cervix realizada', key: 'almenosunacervix' });
    columns.push({ header: 'Dos rondas de Cancer de seno realizadas', key: 'dosmamografia' });
    columns.push({ header: 'Dos rondas de Cancer de cervix realizadas', key: 'doscervix' });

    columns.push({ header: 'Indicación de citología -', key: 'indicacioncitologia' });
    columns.push({ header: 'Indicación de ADN-VPH -', key: 'indicacionadnvph' });

    columns.push({ header: 'Mamografía realizada', key: 'mamografiaRealizada' });
    columns.push({ header: 'Citología cervical realizada', key: 'citologiaRealizada' });
    columns.push({ header: 'ADN - VPH realizado', key: 'adnvph' });


    columns.push({ header: 'Razón por la cual no se realizó la mamografía', key: 'razonnomamografia' });
    columns.push({ header: 'Razón por la cual no se realizó la citología vaginal', key: 'razonnocito' });
    columns.push({ header: 'Razón por la cual no se realizó la prueba de ADN-VPH', key: 'razonnoadnvph' });


    return columns;
}

function headersAnswers() {

    let columns = [
    { header: 'Pregunta ID', key: 'questionID' },
    { header: 'texto', key: 'questiontext' },
    { header: 'Respuesta ID', key: 'answerID' },
    { header: 'Texto', key: 'text' }
    ];

    return columns;
}

function calculateAge(birthday) {

    let age = "";

    if (birthday != undefined && birthday != "") {

        let parts = birthday.split('/');
        let mydate = new Date(parts[2], parts[1] - 1, parts[0] - 1);
        let ageDifMs = Date.now() - mydate;
        let ageDate = new Date(ageDifMs);
        age = Math.abs(ageDate.getUTCFullYear() - 1970);

    }

    return age;
}

function calculateIMC(weight, height) {

    let imc = (weight / (height * height)).toPrecision(5);

    return imc
}