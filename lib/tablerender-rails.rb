require "rails"
require "tablerender-rails/version"

module Tablerender
  module Rails
    if ::Rails.version < "3.1"
      require 'tablerender-rails/railtie'
    else
      require 'tablerender-rails/engine'
    end
  end
end
