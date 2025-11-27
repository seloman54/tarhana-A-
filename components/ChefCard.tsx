import React from 'react';
import { ChefProfile } from '../types';

interface ChefCardProps {
  chef: ChefProfile;
  isSelected: boolean;
  onClick: () => void;
}

const ChefCard: React.FC<ChefCardProps> = ({ chef, isSelected, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer rounded-xl p-3 transition-all duration-200 border-2
        flex flex-col items-center text-center gap-2 relative
        ${isSelected 
          ? 'border-chef-500 bg-white shadow-lg scale-105 ring-2 ring-chef-100' 
          : 'border-transparent bg-white shadow-sm hover:shadow-md hover:bg-orange-50/50'}
      `}
    >
      <div className="text-5xl mb-1">
        {chef.icon}
      </div>
      
      <div>
        <h3 className={`font-bold text-sm leading-tight ${isSelected ? 'text-chef-800' : 'text-gray-800'}`}>
          {chef.name}
        </h3>
        <p className="text-[10px] text-gray-500 mt-1 leading-tight px-1 line-clamp-2">
          {chef.description}
        </p>
      </div>

      {isSelected && (
        <div className="absolute top-2 right-2 text-chef-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChefCard;