import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Product } from './product.service';
import { catchError } from 'rxjs/operators';

export interface CartItem extends Product {
  quantity: number;
  subtotal: number;
  stock: number;
}
export interface CartPostItem {
  cartItemID: number;
  productId: number;
  userId: number;
  quantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalPrice: number;
}


@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'https://localhost:7194/api/Cart';
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadCartFromStorage();
  }

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

  private loadCartFromStorage(): void {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        this.cartSubject.next(JSON.parse(storedCart));
      } catch (error) {
        console.error('Failed to parse cart from storage:', error);
        this.cartSubject.next([]); // Fallback to an empty cart
      }
    } else {
      this.cartSubject.next([]); // Ensure cart is initialized as an empty array
    }
  }

  private saveCartToStorage(cart: CartItem[]): void {
    localStorage.setItem('cart', JSON.stringify(cart));
    this.cartSubject.next(cart);
  }

  getCart(): CartItem[] {
    return this.cartSubject.value;
  }

  addToCart(product: Product, quantity: number = 1): void {
    const headers = this.getHeaders();
    const currentCart = this.cartSubject.value;
    const existingItem = currentCart.find(item => item.id === product.id);

    let updatedCart: CartItem[];

    if (existingItem) {
      updatedCart = currentCart.map(item =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + quantity,
              subtotal: (item.quantity + quantity) * item.price
            }
          : item
      );
    } else {
      const newItem: CartItem = {
        ...product,
        quantity,
        subtotal: quantity * product.price,
        stock: product.quantity // Using product quantity as stock
      };
      updatedCart = [...currentCart, newItem];
    }

    this.saveCartToStorage(updatedCart);

    // Sync with backend
    // this.http.post(`${this.apiUrl}/add`, { productId: product.id, quantity }, { headers })
    //   .pipe(catchError(this.handleError.bind(this)))
    //   .subscribe();
  }

  updateQuantity(productId: number, quantity: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.map(item =>
      item.id === productId
        ? {
            ...item,
            quantity: quantity,
            subtotal: quantity * item.price
          }
        : item
    );

    this.saveCartToStorage(updatedCart);
  }

  removeFromCart(productId: number): void {
    const currentCart = this.cartSubject.value;
    const updatedCart = currentCart.filter(item => item.id !== productId);

    this.saveCartToStorage(updatedCart);
  }

  clearCart(): void {
    localStorage.removeItem('cart');
    this.cartSubject.next([]);
  }

  getCartTotal(): number {
    return this.cartSubject.value.reduce((total, item) => total + item.subtotal, 0);
  }

  getCartItemCount(): number {
    return this.cartSubject.value.reduce((count, item) => count + item.quantity, 0);
  }

  syncWithServer(): Observable<CartItem[]> {
    const token = localStorage.getItem('user_token');
    if (!token) return throwError(() => 'User not logged in');

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<CartItem[]>(`${this.apiUrl}`, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  } 


  postCartItems(items: CartPostItem[]): Observable<any> {
    const token = localStorage.getItem('user_token');
    if (!token) {
      return throwError(() => 'No authentication token found');
    }
  
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  
    // Validate the cart item before sending
    if (!this.validateCartItem(items[0])) {
      return throwError(() => 'Invalid cart data');
    }
  
    // Log the exact payload being sent
    console.log('Sending payload:', JSON.stringify(items[0], null, 2));
  
    // Format the data to match the API expectations
    const cartData = {
      cartItemId: 0,
      productId: items[0].productId,
      userId: items[0].userId,
      quantity: items[0].quantity,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPrice: items[0].totalPrice
    };
  
    return this.http.post(this.apiUrl, cartData, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('API Error:', error);
          if (error.status === 400) {
            console.error('Validation errors:', error.error?.errors);
            return throwError(() => 'Invalid cart data format: ' + JSON.stringify(error.error?.errors));
          } else if (error.status === 401) {
            this.router.navigate(['/login']);
            return throwError(() => 'Please login again');
          } else if (error.status === 403) {
            return throwError(() => 'Access denied');
          }
          return throwError(() => 'An error occurred while processing your request');
        })
      );
  }
  
  private validateCartItem(item: CartPostItem): boolean {
    if (!item) return false;
  
    return (
      typeof item.productId === 'number' && item.productId > 0 &&
      typeof item.userId === 'number' && item.userId > 0 &&
      typeof item.quantity === 'number' && item.quantity > 0 &&
      typeof item.totalPrice === 'number' && item.totalPrice >= 0
    );
  }
}
