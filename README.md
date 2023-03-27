#SERVIDOR CON BALANCE DE CARGA.

## CLUSTER O FORK:

-`node server.js -m` | Se ejecuta, dependiendo del valor del argumento "-m" (CLUSTER O FORK), en modo CLUSTER o FORK:

-`node server.js -m cluster` | modo cluster con los máximos procesos posibles.

-`node server.js -m fork` | modo fork

-`node server.js` | Se ejecuta el servidor en modo FORK por default.

-`kill (PID)` | EN MODO CLUSTER (Si se mata una terminal se levanta una nueva)

## FOREVER:

(levanto 3 servidores (en fork) con 3 puertos diferentes)

-`forever start server.js`
-`forever start server.js 8081`
-`forever start server.js 8082`
-`forever list` | listo todos los procesos.
-`forever stopall` | detendo todos los procesos.

## PM2:

-`pm2 start --watch server.js` | Ejecuto en modo fork.
-`pm2 start server.js --watch -i max` | ejecuto en modo cluster con con los máximos procesos posibles.
-`pm2 list` | listo los procesos.
-`pm2 stop 1` | detengo el proceso con id "1".
-`pm2 delete 1` | elimino el proceso con id "1".
-`pm2 delete all o server` | elimino todos los procesos.

## NGNIX:

-El archivo de configuración se incluyo en la carpeta del desafio.

-El primer punto de la consigna del desafio de nginx es que /api/randoms rediriga a un cluster en 8081 y el resto a 8080. Dicha conf. en Nginx esta comentada.

-`node server.js -m cluster 8081` | Ejecutamos en modo cluster en 8081.
-`node server.js 8080` | para el resto de solicitudes.

-Luego modificamos para que /api/randoms rediriga a un cluster de servidores, repartiéndolas equitativamente entre 4 instancias:

-`node server.js 8082`
-`node server.js 8083`
-`node server.js 8084`
-`node server.js 8085`

-Luego ejecutamos Nginx y nos dirigimos a 'localhost/api/randoms', la misma nos redirige de manera equivalente a los 4 puertos previamente configurados en el upstream.