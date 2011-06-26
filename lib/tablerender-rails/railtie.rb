require 'rails'

module Tablerender
  module Rails
    class Railtie < ::Rails::Railtie
      generators do
        require 'tablerender-rails/generators'
      end
    end
  end
end
