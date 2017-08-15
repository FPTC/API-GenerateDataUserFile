/**
 * LeadIS Consulting
 * Autor: Juan Guillermo Gómez
 * Fecha: 21/06/2017
 * Functions en firebase para validar las respuestas y decidir que premios mostrar
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
const PROJECT_ID = 'fptc-test';
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
        let users = admin.database().ref(`usuarios`).once("value").then(usuarios => { return usuarios });

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
            fillAnswersText(questionsTMPBreast, questionsTMPCervix, sheet2);

            // Se convierten las preguntas a un array para facilitar su procesamiento
            questionsTMPBreast = convertQuestionArray(questionsTMPBreast);
            questionsTMPCervix = convertQuestionArray(questionsTMPCervix);

            let usersTMP = data[1];

            var rows = [];

            var promisesUsers = [];

            // Se itera por cada usuario y se crea una promesa por sus respuestas
            usersTMP.forEach(usuario => {

                //console.log(usuario.val());                

                // Datos del usuario
                let row = `{"dateCreated":"${usuario.val().dateCreated}", "name":"${usuario.val().name}", "lastName": "${usuario.val().lastName}",`
                    + `"dateBirthday": "${usuario.val().dateBirthday}", `
                    + `"phoneNumber": "${usuario.val().phoneNumber}", "address": "${usuario.val().address}", "neighborhood": "${usuario.val().neighborhood}",`
                    + `"email": "${usuario.val().email}", "state": ${usuario.val().state}`;

                if ('breastIndication' in usuario.val()) {
                    row += `, "breastIndication": ${usuario.val().breastIndication}`
                }

                if ('cervixIndication' in usuario.val()) {
                    row += `, "cervixIndication": ${usuario.val().cervixIndication}`
                }

                if (usuario.val().pointsTotal != undefined) {
                    row += `, "points": ${usuario.val().pointsTotal}`
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

                if (usuario.val().weight != undefined && usuario.val().weight != "" &&
                    usuario.val().height != undefined && usuario.val().height != "") {
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

                //console.log(usuario.val());

                promisesUsers.push(fillAnswers(questionsTMPBreast, questionsTMPCervix, 0, usuario.key, row));

            });

            // Se espera por todas las respuestas de todos los usuarios y las respuestas con sus textos
            Promise.all(promisesUsers).then((resultPromises) => {

                console.log("Termino todo");

                resultPromises.forEach(result => {
                    sheet1.addRow(result);
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
                    cacheControl: "public, max-age=300",
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

                //console.log(finalRow);

                resolve(JSON.parse(finalRow));

            } catch (error) {
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

                        if (answersUsu.val() != null && 'respuesta1' in answersUsu.val() && answersUsu.val().respuesta1 != null) {
                            row = row + `"${questionsTMP[index].key}_2": "${answersUsu.val().respuesta1}"`;
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

    console.log("Entroooooo");

    //console.log(questionsBreast);

    let row = "";

    try {

        questionsBreast.forEach(question => {

            question.child("answers").forEach(data => {                
                row = "";
                row = `{"answerID":"${data.key}", "text":"${data.val().description}"}`;
                //console.log(row);
                sheet2.addRow(JSON.parse(row));
            });

        });

        questionsCervix.forEach(question => {

             question.child("answers").forEach(data => {                
                row = "";
                row = `{"answerID":"${data.key}", "text":"${data.val().description}"}`;
                //console.log(row);
                sheet2.addRow(JSON.parse(row));
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
        { header: 'Fecha Creación', key: 'dateCreated' },
        { header: 'Nombre', key: 'name' },
        { header: 'Apellidos', key: 'lastName' },
        { header: 'Fecha de Nacimiento', key: 'dateBirthday' },
        { header: 'Edad', key: 'age' },
        { header: 'Num de Celular', key: 'phoneNumber' },
        { header: 'Dirección', key: 'address' },
        { header: 'Barrio', key: 'neighborhood' },
        { header: 'Altura', key: 'height' },
        { header: 'Peso', key: 'weight' },
        { header: 'Correo Electronico', key: 'email' },
        { header: 'Número de Hijos', key: 'hasChilds' }
    ];

    for (let i = 1; i <= numOpportunities; i++) {

        let indexQuestion = 1;

        questionsBreast.forEach(question => {
            columns.push({ header: `PS_${indexQuestion}_${i} ${question.val().text}`, key: `${question.key}_${i}` });
            indexQuestion++;
        });

        indexQuestion = 1;

        questionsCervix.forEach(question => {
            columns.push({ header: `PCU_${indexQuestion}_${i} ${question.val().text}`, key: `${question.key}_${i}` });
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

    return columns;
}

function headersAnswers() {

    let columns = [
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