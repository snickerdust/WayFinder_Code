from flask import Flask, request, render_template, jsonify
import googlemaps
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime

app = Flask(__name__)

# Define API Key
API_KEY = 'AIzaSyBfikpq18Zeyg4Tb37Wrbyq0Gsopm8b7YM'  # Ganti dengan kunci API Anda yang sebenarnya

# Initialize Google Maps client
gmaps = googlemaps.Client(key=API_KEY)

# Function to get nearby places
def get_nearby_places(location, radius, place_type, max_results=10):
    places_result = gmaps.places_nearby(location=location, radius=radius, type=place_type)
    results = places_result.get('results', [])
    return results[:max_results]

# Function to get place details
def get_place_details(place_id):
    details = gmaps.place(place_id=place_id)
    return details.get('result', {})

# Function to format time
def format_time(time_str):
    """Convert a time string in the format 'HHMM' to 'HH:MM'."""
    if len(time_str) == 4:
        return f"{time_str[:2]}:{time_str[2:]}"
    return time_str

# Function to get today's opening hours
def get_today_opening_hours(opening_hours):
    today = datetime.now().weekday()
    for period in opening_hours:
        if period['open']['day'] == today:
            open_time = format_time(period['open'].get('time', 'N/A'))
            close_time = format_time(period['close'].get('time', 'N/A')) if 'close' in period else 'Open 24 hours'
            if close_time == 'N/A':
                return "Open: 24 hours"
            return f"Open: {open_time}, Close: {close_time}"
    return "Opening Hours: N/A"

# Function to create a directions URL
def get_directions_url(origin, destination):
    return f"https://www.google.com/maps/embed/v1/directions?key={API_KEY}&origin={origin['lat']},{origin['lng']}&destination={destination['lat']},{destination['lng']}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recommendations', methods=['POST'])
def get_recommendations():
    data = request.get_json()
    location = data.get('location')
    radius = data.get('radius', 5000)

    try:
        lat, lon = map(float, location.split(','))
    except ValueError:
        return jsonify({'error': 'Invalid location format'}), 400

    place_types = ['restaurant', 'lodging', 'cafe', 'tourist_attraction']

    user_ids = []
    place_ids = []
    ratings = []
    place_names = []
    place_categories = []
    place_locations = []
    place_photos = []
    place_ratings = []
    place_addresses = []
    place_phone_numbers = []
    place_opening_hours = []
    place_directions = []

    user_id_counter = 1
    for place_type in place_types:
        places = get_nearby_places({'lat': lat, 'lng': lon}, radius, place_type)
        for place in places:
            place_id = place['place_id']
            place_name = place['name']
            place_details = get_place_details(place_id)
            if 'reviews' in place_details:
                for review in place_details['reviews']:
                    user_ids.append(user_id_counter)
                    place_ids.append(place_id)
                    ratings.append(review['rating'])
                    place_names.append(place_name)
                    place_categories.append(place_type)
                    place_locations.append(place_details['geometry']['location'])
                    place_photos.append(place_details['photos'][0]['photo_reference'] if 'photos' in place_details else None)
                    place_ratings.append(place_details['rating'])
                    place_addresses.append(place.get('vicinity', 'N/A'))
                    place_phone_numbers.append(place_details.get('international_phone_number', 'N/A'))
                    
                    opening_hours = place_details.get('opening_hours', {}).get('periods', [])
                    today_hours = get_today_opening_hours(opening_hours)
                    place_opening_hours.append(today_hours)

                    direction_url = get_directions_url({'lat': lat, 'lng': lon}, place_details['geometry']['location'])
                    place_directions.append(direction_url)
                    
                    user_id_counter += 1

    ratings_data = pd.DataFrame({
        'user_id': user_ids,
        'place_id': place_ids,
        'rating': ratings,
        'place_name': place_names,
        'category': place_categories,
        'location': place_locations,
        'photo': place_photos,
        'place_rating': place_ratings,
        'address': place_addresses,
        'phone_number': place_phone_numbers,
        'opening_hours': place_opening_hours,
        'directions': place_directions
    })

    user_place_matrix = ratings_data.pivot(index='user_id', columns='place_id', values='rating')
    user_place_matrix = user_place_matrix.fillna(0)
    user_similarity = cosine_similarity(user_place_matrix)

    place_id_to_name = dict(zip(ratings_data['place_id'], ratings_data['place_name']))
    place_id_to_category = dict(zip(ratings_data['place_id'], ratings_data['category']))
    place_id_to_location = dict(zip(ratings_data['place_id'], ratings_data['location']))
    place_id_to_photo = dict(zip(ratings_data['place_id'], ratings_data['photo']))
    place_id_to_rating = dict(zip(ratings_data['place_id'], ratings_data['place_rating']))
    place_id_to_address = dict(zip(ratings_data['place_id'], ratings_data['address']))
    place_id_to_phone_number = dict(zip(ratings_data['place_id'], ratings_data['phone_number']))
    place_id_to_opening_hours = dict(zip(ratings_data['place_id'], ratings_data['opening_hours']))
    place_id_to_directions = dict(zip(ratings_data['place_id'], ratings_data['directions']))

    def recommend_places_with_details(user_id, user_similarity, user_place_matrix, place_id_to_name, place_id_to_category, place_id_to_location, place_id_to_photo, place_id_to_rating, place_id_to_address, place_id_to_phone_number, place_id_to_opening_hours, place_id_to_directions, top_n=10):
        user_index = user_place_matrix.index.get_loc(user_id)
        similarity_scores = list(enumerate(user_similarity[user_index]))
        similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
        similar_users = [i[0] for i in similarity_scores[1:]]

        similar_users_scores = [score[1] for score in similarity_scores[1:]]
        
        user_ratings = user_place_matrix.iloc[similar_users]
        user_ratings = user_ratings.mean(axis=0)
        user_ratings = user_ratings.sort_values(ascending=False)
        
        recommended_places = user_ratings.index[:top_n]
        recommended_places_with_details = [
            (
                place_id_to_name[place_id], place_id_to_category[place_id], place_id_to_location[place_id], 
                place_id_to_photo[place_id], place_id_to_rating[place_id], place_id_to_address[place_id], 
                place_id_to_phone_number[place_id], place_id_to_opening_hours[place_id], place_id_to_directions[place_id]
            ) 
            for place_id in recommended_places
        ]
        
        recommendations_by_category = {
            'restaurant': [],
            'lodging': [],
            'cafe': [],
            'tourist_attraction': []
        }
        for place, category, location, photo, rating, address, phone_number, opening_hours, directions in recommended_places_with_details:
            if category in recommendations_by_category:
                recommendations_by_category[category].append((place, location, photo, rating, address, phone_number, opening_hours, directions))
        
        return similar_users_scores, user_ratings, recommendations_by_category

    user_id = 1
    similar_users_scores, user_ratings, recommended_places_by_category = recommend_places_with_details(
        user_id, user_similarity, user_place_matrix, place_id_to_name, place_id_to_category, place_id_to_location, 
        place_id_to_photo, place_id_to_rating, place_id_to_address, place_id_to_phone_number, 
        place_id_to_opening_hours, place_id_to_directions, top_n=10
    )

    recommendations = []
    for category, places in recommended_places_by_category.items():
        for place in places:
            recommendations.append({
                'place': place[0],
                'category': category,
                'rating': place[3],
                'address': place[4],
                'phone_number': place[5],
                'opening_hours': place[6],
                'photo': place[2],
                'directions': place[7]
            })

    trip_planner = []
    for category, places in recommended_places_by_category.items():
        # Find the place with the highest rating in this category
        highest_rated_place = max(places, key=lambda x: x[3])
        trip_planner.append({
            'place': highest_rated_place[0],
            'opening_hour': highest_rated_place[6],
            'category': category
        })

    return jsonify({
        'recommendations': recommendations,
        'trip_planner': trip_planner
    })

if __name__ == '__main__':
    app.run(debug=True)
