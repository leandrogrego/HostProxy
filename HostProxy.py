from flask import Flask, request, send_from_directory, make_response
import os
import ssl
import http.client

app = Flask(__name__)

# Lista de redirecionamentos
hosts = [
    {'name': 'www.mydomain.com', 'type': 'port', 'data': 8000, 'ssl': True},
    {'name': 'otherhost.mydomain.com', 'type': 'file', 'data': 'index.html', 'ssl': False},
    {'name': 'localhost', 'type': 'port', 'data': 8001, 'ssl': True},
    {'name': 'rsl.leandrorego.com', 'type': 'port', 'data': 8080, 'ssl': True},
    {'name': 'tesefinder.pointsoft.com.br', 'type': 'port', 'data': 8081, 'ssl': True}
    
    
]

import ssl

# Redirecionamento de porta
def port_proxy(port, path, method, headers, body, use_ssl):
    connection_class = http.client.HTTPSConnection if use_ssl else http.client.HTTPConnection

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE if use_ssl else ssl.CERT_OPTIONAL

    connection = connection_class(f'127.0.0.1:{port}', context=ssl_context)
    print(path)
    try:
        # Convertendo headers para um dicionário
        headers_dict = dict(headers)

        connection.request(method, path, body=body, headers=headers_dict)
        response = connection.getresponse()

        content = response.read()
        status = response.status
        headers = response.getheaders()

        # Criar resposta do Flask
        flask_response = make_response(content, status)
        for key, value in headers:
            print(key)
            print(value)
            flask_response.headers[key] = value

        return flask_response

    finally:
        connection.close()


# Retorno de arquivo
def proxy_file(path):
    print("GET File!")
    return send_from_directory(os.getcwd(), path)

# Retorno de texto
def proxy_text(data):
    return data

# Rota principal
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def main(path):
    host = next((h for h in hosts if request.host == h['name']), None)

    if host is None:
        return proxy_text(request.host)
    else:
        if host['type'] == 'port':
            use_ssl = host['ssl']
            return port_proxy(
                host['data'],
                path,
                request.method,
                request.headers,
                request.get_data(),
                use_ssl
            )
        elif host['type'] == 'file':
            return proxy_file(host['data'])
        elif host['type'] == 'text':
            return proxy_text(host['data'])
        else:
            return proxy_text(request.host)

if __name__ == '__main__':
    # Configuração do SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    context.load_cert_chain('../certificate/Service.cert', '../certificate/service.key')

    # Executar aplicação Flask
    app.run(host='0.0.0.0', port=443, ssl_context=context, debug=True)
