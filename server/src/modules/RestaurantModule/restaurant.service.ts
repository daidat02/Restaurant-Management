import type { IRestaurant } from '../../models/Schema/RestaurantSchema.js';
import restaurantRepository from './restaurant.repository.js';

class RestaurantSerice {
  async createRestaurantService(restaurantData: any): Promise<any> {
    const restaurant = await restaurantRepository.createRestaurant(restaurantData);
    return { message: 'Tạo nhà hàng thành công!!!', data: restaurant, code: 201 };
  }

  async getRestaurantByIdService(id: string): Promise<any> {
    const restaurant = await restaurantRepository.findRestaurantById(id);
    if (!restaurant) {
      return { message: 'Nhà hàng không tồn tại!!!', code: 404 };
    }
    return { message: 'Lấy nhà hàng thành công!!!', data: restaurant, code: 200 };
  }

  async findAllRestaurantsService(): Promise<any> {
    const restaurants = await restaurantRepository.findRestaurants({});
    return { message: 'Lấy danh sách nhà hàng thành công!!!', data: restaurants, code: 200 };
  }

  async updateRestaurantService(id: string, restaurantData: any): Promise<any> {
    const exitRestaurant = await restaurantRepository.findRestaurantById(id);
    if (!exitRestaurant) {
      return { message: 'Nhà hàng không tồn tại!!!', code: 404 };
    }
    const restaurant = await restaurantRepository.updateRestaurant(id, restaurantData);
    return { message: 'Cập nhật nhà hàng thành công!!!', data: restaurant, code: 200 };
  }

  async deleteRestaurantService(id: string): Promise<any> {
    const exitRestaurant = await restaurantRepository.findRestaurantById(id);
    if (!exitRestaurant) {
      return { message: 'Nhà hàng không tồn tại!!!', code: 404 };
    }
    const result = await restaurantRepository.deleteRestaurant(id);
    if (!result) {
      return { message: 'Xóa nhà hàng thất bại!!!', code: 500 };
    }
    return { message: 'Xóa nhà hàng thành công!!!', code: 200 };
  }
}

export default RestaurantSerice;
