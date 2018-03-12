const {models} = require('./model');
const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require("./out");


/**
* Muestra la ayuda.
*
* @param rl Objeto readline usado para implementar el CLI.
*/
exports.helpCmd = rl => {
    log("Comandos");
    log("   h|help -h|help - Muestra esta ayuda.");
    log("   list - Listar los quizzes existentes.");
    log("   show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("   add - Añadir un nuevo quiz interactivamente.");
    log("   delete <id> - Borrar el quiz indicado.");
    log("   edit <id> - Editar el quiz indicado.");
    log("   test <id> - Probar el quiz indicado.");
    log("   p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("   credits - Créditos.");
    log("   q|quit - Salir del programa.");
    rl.prompt();
};
  
/**
 * Lista todos los quizzes existentes en el modelo.
 * 
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    models.quiz.findAll()
    .each(quiz => {
            log(`  [${ colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Esta funcion devuelve una promesa que:
 *  - Valida que se ha introducido un valor para el parametro.
 *  - Convierte el parametro en un numero entero.
 * 
 * @param id Parametro con el índice a validar.
 */
const validateId = id => {
    return new Promise((resolve, reject) => {
        if (typeof id === "undefined"){
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id);
            if (Number.isNaN(id)){
                reject(new Error(`El valor del parametro <id> no es un numero.`));
            } else {
                resolve(id);
            }
        }
    });
};

/**
 * Funcion que devuelve una promesa si se cumple con las condiciones
 * 
 * @param rl Objeto readLine usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};
  
 /**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param id Clave del quiz a mostrar.
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.showCmd = (rl,id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        log(`  [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};


/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 * 
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl => {
    makeQuestion(rl, ' Introduzca una pregunta: ')
    .then(q => {
        return makeQuestion(rl, ' Introduzca la respuesta: ')
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then((quiz) => {
        log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo: ');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};
  
 /**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl,id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};
  
/**
 * Edita un quiz del modelo,
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl,id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
            return makeQuestion(rl, ' Introduzca la respuesta: ')
            .then(a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es errorneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
 };
  
  
 /**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
 exports.testCmd = (rl,id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz){
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }
        return makeQuestion(rl, `${quiz.question}: ` )
        .then(a => {
            if(a.trim().toUpperCase() === quiz.answer.toUpperCase()){
                log('Su respuesta es: ');
                biglog('Correcta','green');
            } else {
                log('Su respuesta es:');
                biglog('Incorrecta','red');
            }
        })
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
 };
  
/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 * 
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.playCmd = rl => {
    let score = 0;
    let toBeResolved = []; 
    let i = 0;


    models.quiz.findAll()
    .each(quiz => {
        toBeResolved[i] = i;
        i++;
    })
    .then(() => {
        playOne()
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        })
    })

    const playOne = () =>{
        return new Sequelize.Promise((resolve, reject) => {
            if(toBeResolved.length === 0){
                log('No hay nada más que preguntar');
                log(`Fin del examen. Aciertos: ${score}`);
                biglog(score, 'magenta');
                resolve();
            } else {
                let num = Math.floor((Math.random() * toBeResolved.length));
                let id = toBeResolved[num] + 1;
                toBeResolved.splice(num,1); 
                models.quiz.findById(id)
                .then(quiz => {
                    if (!quiz){
                        reject (new Error(`No existe un quiz asociado al id=${id}.`));
                    }
                    return makeQuestion(rl, `${quiz.question}: `)
                    .then(a => {
                        if(a.trim().toUpperCase() === quiz.answer.toUpperCase()){
                            log('Su respuesta es: ');
                            biglog('Correcta','green');
                            log(`Lleva ${++score} aciertos.`); 
                            playOne()
                            .then(() => {
                                resolve();
                            })
                        } else {
                            log('Su respuesta es:');
                            biglog('Incorrecta','red');
                            log(`Fin del examen. Aciertos: `);
                            biglog(score, 'magenta');
                            resolve();
                        }
                    })
                }); 
            }
        })  
    };
};
  
/**
 * Muestra los nombres de los autores de la práctica
 * 
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = rl => {
    log('Autores de la práctica: ');
    log('Xinxin Liu','green');
    rl.prompt();
};
  
/**
 * Termina el programa.
 * 
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};
   

































