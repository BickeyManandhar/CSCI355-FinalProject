const fs = require("fs");// to read the form
const http = require("http"); //establish our server
const https = require("https"); //establish connection with APIs
const url = require("url"); // to parse the url
const {api_key_omdb,api_key_gender} = require("./auth/api_key.json"); //destructing assignments

const port = 3000;
const server = http.createServer(); // loading our server

server.on("listening", listen_handler);
server.listen(port);
function listen_handler() {
	console.log(`Now Listening on Port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res) {
	console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`); //printing out the requested url
	if (req.url === "/") {
		const form = fs.createReadStream("html/index.html");
		res.writeHead(200, { "Content-Type": "text/html" })
		form.pipe(res);
	}
	else if (req.url.startsWith("/search")) {
		let { movie_name } = url.parse(req.url, true).query;
		console.log(`movie_name length: ${movie_name.length}`);
		if(movie_name==="" || movie_name.length ===0){
			const form = fs.createReadStream("html/index.html");
			res.writeHead(200, { "Content-Type": "text/html" });
			res.write(`<p style="color:#FF0000">Please provide the movie name.</p>`);
			form.pipe(res);
		}
		else if(movie_name!=="" || movie_name.length !==0){
			//console.log(`Entered if statement.`);
			get_information(movie_name, res);
		}
	}
	else {
		res.writeHead(404, { "Content-Type": "text/html" });
		res.end(`<h1>404 Not Found</h1>`);
	}
}

const getData = (stream, callback) => {
	let movie_data = "";
	stream.on("data", chunk => movie_data += chunk);
	stream.on("end", () => callback(JSON.parse(movie_data)))
}

function get_information(movie_name, callback) {

	const movie_endpoint = `https://www.omdbapi.com/?t=${movie_name}&apikey=${api_key_omdb}`; //api one 
	const movie_request = https.get(movie_endpoint, { method: "GET" });

	movie_request.once("response", (s) => getData(s, (movie) => {
		console.log("second");
		// In this if condition check movie name (given input is not in the OMDB database ) return 404 error  
		if (movie.Director == undefined) {
			callback.writeHead(404, { "Content-Type": "text/html" });
			callback.end(`<h1>404 Not Found</h1>`);
		}
		// This API simply fatching gender by using movie director name so far.
		const gender_endpoint = `https://gender-api.com/get?name=${movie.Director}&key=${api_key_gender}`; //api two
		const gender_request = https.get(gender_endpoint, res => {
			let gender = '';
			res.on('data', chunk => gender += chunk);
			res.on('end', () => {
				console.log("fourth");
				//Here we are getting  movie as well as gender and the parse movie function returning the response to the client 
				parse_movie(movie, gender, callback);
			});
		});
		gender_request.on('error', err => {
			return callback(err, null)
		});
		console.log("third");
	}));

	console.log("first");
} 

function parse_movie(movie_data, gender, res) {
	let movie_object = movie_data;
	let gender_object = JSON.parse(gender);
	let movie_title = movie_object?.Title;
	let movie_plot = movie_object?.Plot;
	let movie_director = movie_object?.Director;
	res.writeHead(200, { "Content-Type": "text/html" });
	res.write(`<h1>Movie Title:</h1><ul>${movie_title}</ul>`);
	res.write(`<h1>Movie Director:</h1><ul>${movie_director}</ul>`);
	res.write(`<h1>Movie Plot:</h1><ul>${movie_plot}</ul>`);
	res.write(`<h1>Gender:</h1><ul>${gender_object.gender}</ul>`);
	res.write(`<h1>Accuracy:</h1><ul>${gender_object.accuracy}</ul>`);
	res.end();
}