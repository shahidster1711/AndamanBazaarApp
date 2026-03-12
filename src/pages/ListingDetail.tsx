import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getListing, subscribeToListing } from '../lib/database';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { getCurrentUserId } from '../lib/auth';
import { ReportModal } from '../components/ReportModal';
import { TrustBadge } from '../components/TrustBadge';
import { Profile } from '../types';
import { Listing } from '../lib/database';
import { MapPin, Shield, Share2, MessageSquare, Heart, ChevronLeft, AlertCircle, Edit3, Loader2, Tag, Clock, ShieldCheck, Package, Phone, MessageCircle, BadgeCheck, Rocket, Star } from 'lucide-react';
import { useToast } from '../components/Toast';
import { BoostListingModal } from '../components/BoostListingModal';
import { COPY } from '../lib/localCopy';
import { Seo } from '../components/Seo';

export const ListingDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [similarListings, setSimilarListings] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const { showToast } = useToast();

  const fetchListingDetails = async () => {
    try {
      if (!id) return;

      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      // 1. Fetch listing using new database layer
      const listingData = await getListing(id);
      if (!listingData) {
        navigate('/404');
        return;
      }
      
      setListing(listingData);

      // 2. Fetch seller profile from Firestore
      if (listingData.userId) {
        const sellerSnap = await getDoc(doc(db, 'users', listingData.userId));
        if (sellerSnap.exists()) setSeller(sellerSnap.data() as any);
      }

      // 3. Check if favorited
      if (userId) {
        const favQ = query(
          collection(db, 'favorites'),
          where('userId', '==', userId),
          where('listingId', '==', id)
        );
        const favSnap = await getDocs(favQ);
        setIsFavorited(!favSnap.empty);
      }

    } catch (error) {
      console.error('Error fetching listing details:', error);
      navigate('/404');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId || !id) return;

      const favQ = query(
        collection(db, 'favorites'),
        where('userId', '==', userId),
        where('listingId', '==', id)
      );
      const favSnap = await getDocs(favQ);
      setIsFavorited(!favSnap.empty);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        showToast('Please login to favorite listings', 'error');
        return;
      }
      if (!id) return;

      if (isFavorited) {
        const favQ = query(
          collection(db, 'favorites'),
          where('userId', '==', userId),
          where('listingId', '==', id)
        );
        const favSnap = await getDocs(favQ);
        await Promise.all(favSnap.docs.map(d => deleteDoc(d.ref)));
        setIsFavorited(false);
        showToast('Removed from favorites', 'success');
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId,
          listingId: id,
          createdAt: serverTimestamp(),
        });
        setIsFavorited(true);
        showToast('Added to favorites', 'success');
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast('An error occurred', 'error');
    }
  };

  const shareListing = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title,
        text: listing?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard', 'success');
    }
  };

  const contactSeller = () => {
    if (!currentUserId) {
      showToast('Please login to contact seller', 'error');
      return;
    }
    navigate(`/chat/${id}`);
  };

  useEffect(() => {
    fetchListingDetails();
    checkFavoriteStatus();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToListing(id, (updatedListing) => {
      if (updatedListing) {
        setListing(updatedListing);
      } else {
        navigate('/404');
      }
    });

    return unsubscribe;
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Listing Not Found</h2>
          <p className="text-gray-600 mb-4">This listing may have been removed or is no longer available.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo 
        title={listing.title}
        description={listing.description}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={shareListing}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFavorite}
                  className="p-2 text-gray-600 hover:text-red-600"
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-600 text-red-600' : ''}`} />
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Images and Details */}
            <div className="lg:col-span-2">
              {/* Image Gallery */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                  {listing.images.length > 0 ? (
                    <img
                      src={listing.images[activeImage].url}
                      alt={listing.images[activeImage].alt}
                      className="w-full h-96 object-cover"
                    />
                  ) : (
                    <div className="w-full h-96 flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {listing.images.length > 1 && (
                  <div className="flex space-x-2 p-4 overflow-x-auto">
                    {listing.images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setActiveImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          activeImage === index ? 'border-blue-600' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Listing Details */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.city}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {listing.createdAt.toDate().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      ₹{listing.price.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {listing.status === 'active' ? 'Available' : listing.status}
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>

                {/* Category and Tags */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {listing.category}
                  </span>
                  {listing.isFeatured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </span>
                  )}
                </div>
              </div>

              {/* Seller Info */}
              {seller && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Seller Information</h3>
                    <TrustBadge level={seller.trust_level || 'newbie'} />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {seller.profile_photo_url ? (
                        <img
                          src={seller.profile_photo_url}
                          alt={seller.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {seller.name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{seller.name || 'Anonymous'}</h4>
                      <p className="text-sm text-gray-600">
                        {seller.total_listings || 0} listings • {seller.successful_sales || 0} sales
                      </p>
                      {seller.is_location_verified && (
                        <div className="flex items-center text-sm text-green-600 mt-1">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Location Verified
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={contactSeller}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Action Buttons */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={contactSeller}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Contact Seller
                  </button>
                  
                  <button
                    onClick={toggleFavorite}
                    className={`w-full px-4 py-3 rounded-lg flex items-center justify-center ${
                      isFavorited
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    <Heart className={`w-5 h-5 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                    {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                  
                  <button
                    onClick={() => setIsBoostModalOpen(true)}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center justify-center"
                  >
                    <Rocket className="w-5 h-5 mr-2" />
                    {listing.isFeatured ? 'Extend Boost' : 'Boost My Listing'}
                  </button>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Safety Tips
                </h3>
                
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Meet in a public place for transactions</li>
                  <li>• Inspect the item before paying</li>
                  <li>• Use secure payment methods</li>
                  <li>• Verify the seller's location</li>
                  <li>• Trust your instincts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        listingId={id || ''} 
        listingTitle={listing.title} 
      />
      <BoostListingModal
        isOpen={isBoostModalOpen}
        onClose={() => setIsBoostModalOpen(false)}
        listingId={listing.id}
        listingTitle={listing.title}
      />
    </>
  );
};
