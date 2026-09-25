import grpc from 'k6/net/grpc';

import { check, sleep } from 'k6';


const client = createClient();
client.load(['.'], 'helloworld.proto');
function createClient() {
    return new grpc.Client();
}

export function client_test (message='none message'){
  client.connect('192.168.31.179:50051',{plaintext: true, timeout: '5s' });
  
  console.log("connect success")
  const data = {'name': message};
  const response = client.invoke('helloworld.Greeter/SayHello', data);

  check(response, {
    'status is OK': (r) => r && r.status === grpc.StatusOK,
  });
  

  console.log(JSON.stringify(response.message));

  client.close();
  sleep(1);
};
