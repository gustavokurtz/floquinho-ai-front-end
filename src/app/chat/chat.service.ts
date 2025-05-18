import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  apiUrl: string = 'http://localhost:8080/chat'

  constructor(private http: HttpClient) { }


  chat(msg: string){
    return this.http.post(this.apiUrl, msg).pipe(map((response) => {
      return response
    }))

  }

}
