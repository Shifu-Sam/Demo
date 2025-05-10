import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';

export interface Product {
  // stock: number;
  id: number;
  name: string;
  brand: string;
  price: number;
  description: string;
  imageUrl: string;
  quantity: number;
  categoryId: number;
  subCategoryId: number;
  soldCount: number;
}


@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products: Product[] = [];

  private apiUrl = 'https://localhost:7194/api/Product';



  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('user_token');
    if (!token) {
      this.router.navigate(['/user-login']);
      return new HttpHeaders();
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.status === 401) {
      errorMessage = 'Session expired. Please login again';
      localStorage.removeItem('user_token');
      this.router.navigate(['/user-login']);
    }
    return throwError(() => errorMessage);
  }

  getAllProducts(): Observable<Product[]> {
    const headers = this.getHeaders();
    return this.http.get<Product[]>(this.apiUrl, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  }

  getProductById(id: number): Observable<Product> {
    const headers = this.getHeaders();
    return this.http.get<Product>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  }



  getProductsByCategory(categoryId: number): Observable<Product[]> {
    const headers = this.getHeaders();
    return this.http.get<Product[]>(`${this.apiUrl}/category/${categoryId}`, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  }
  categoryMap: { [key: number]: string } = {
    1: 'Digital',
    2: 'Analogue',
    3: 'Smart'
  };
  getCategoryName(categoryId: number): string {
    return this.categoryMap[categoryId] || 'Unknown';
  }

  // searchProducts(query: string): Observable<Product[]> {
  //   const headers = this.getHeaders();
  //   return this.http.get<Product[]>(`${this.apiUrl}/search?query=${query}`, { headers })
  //     .pipe(catchError(this.handleError.bind(this)));
  // }
}
