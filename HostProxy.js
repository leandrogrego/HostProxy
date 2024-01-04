    //////////////////////////////////////
   //         HOST PROXY v0.1          //
  //    Developed by: Leandro Rego    //
 // contact: contato@leandrorego.com //
//////////////////////////////////////

var https = require('https');
var http = require('http');
var fs = require('fs');

// objeto com lista de redirecionamentos
const options = {
    //pfx: fs.readFileSync('serviceapp.p12'),
    //passphrase: 'reset79'
    key: fs.readFileSync('../certificate/service.key'),
    cert: fs.readFileSync('../certificate/Service.cert')
};

var hosts = [
  {name: 'www.mydomain.com', type: 'port', data: 8000},
  {name: 'otherhost.mydomain.com', type: 'file', data: 'index.html'},
  {name: 'localhost', type: 'text', data: 'LOCALHOST'}
]

// redirecionamento de porta
function proxyPort(req, res, port){
  console.log('redirecting to port '+port)
  _req = http.request(
    {port, path:req.url, headers:req.headers, method:req.method}, 
    (_res) => {
      res.writeHead(_res.statusCode, _res.headers)
      _res.pipe(res)
          }
  )
  _req.on('error', (e) => {
      console.error('proxied request failed: '+e.message)
      res.writeHead(500)
      res.end()
  })
  req.pipe(_req)
} 

// retorno de arquivo
function proxyFile(req, res, path){
  req.url == '/' ? path += 'index.html' : path+=req.url
  console.log('redirecting to file '+path);
  fs.readFile(path, function(err, data) {
    err != null ? data = 'Erro ao abrir '+req.url+'<br/>'+err : {};
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    return res.end();
  })
}
// retorno de texto
function proxyText(req, res, data){
  console.log('return text : '+data);
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(data);
  return res.end();
};

//server listen
http.createServer(function (req, res) {
  req.headers.host == undefined ? req.headers.host = '' : {}
  console.log('Access to : http://'+req.headers.host);
  var host = null;
  hosts.forEach(h => {
    req.headers.host+"" == h.name ? host = h : {};
  });
  if(host == null) proxyText(req, res, req.headers.host); else
  switch(host.type){
    case 'port' : proxyPort(req, res, host.data);
      break;
    case 'file' : proxyFile(req, res, host.data);
      break;
    case 'text' : proxyText(req, res, host.data);
      break;
    default : 
      proxyText(req, res, req.headers.host);
  }
}).listen(80, () => console.log('listening on port 80...'));

https.createServer(options, function (req, res) {
  req.headers.host == undefined ? req.headers.host = '' : {}
  console.log('Access to : https://'+req.headers.host);
  var host = null;
  hosts.forEach(h => {
    req.headers.host+"" == h.name ? host = h : {};
  });
  if(host == null) proxyText(req, res, req.headers.host); else
  switch(host.type){
    case 'port' :       
      console.log('redirecting to port '+host.data)
      serv = host.ssl ? https : http
      _req = serv.request(
        {
          rejectUnauthorized : false,
          port:host.data, 
          path:req.url, 
          headers:req.headers, 
          method:req.method
        }, 
        (_res) => {
          res.writeHead(_res.statusCode, _res.headers)
          _res.pipe(res)
        }
      )
      _req.on('error', (e) => {
          console.error('proxied request failed: '+e.message)
          res.writeHead(500)
          res.end()
      })
      req.pipe(_req)
      break
    case 'file' : proxyFile(req, res, host.data);
      break;
    case 'text' : proxyText(req, res, host.data);
      break;
    default : 
      proxyText(req, res, req.headers.host);
  }
}).listen(443, () => console.log('listening on port 443...'));