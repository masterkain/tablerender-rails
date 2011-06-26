require 'rails/generators'

module Tablerender
  class Install < ::Rails::Generators::Base
    JAVASCRIPTS = File.expand_path('../../../vendor/assets/javascripts', __FILE__)

    def self.source_root
      @source_root ||= JAVASCRIPTS
    end

    def copy_tablerender
      Dir[File.join(JAVASCRIPTS, '*.js')].each do |file|
        file = File.split(file).last
        copy_file file, "public/javascripts/#{file}"
      end
    end
  end
end
