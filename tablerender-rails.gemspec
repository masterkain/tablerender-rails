# -*- encoding: utf-8 -*-
require File.expand_path('../lib/tablerender-rails/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors       = ["Fabio Tunno", "Claudio Poli"]
  gem.email         = ["fabio@audiobox.fm"]
  gem.description   = 'Adds tablerender.js to the asset pipeline.'
  gem.summary       = 'JavaScript Table Rendered for Rails 3.1+'
  gem.homepage      = 'https://github.com/masterkain/tablerender-rails'

  gem.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  gem.files         = `git ls-files`.split("\n")
  gem.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  gem.name          = "tablerender-rails"
  gem.require_paths = ['lib']
  gem.version       = Tablerender::Rails::VERSION

  gem.add_dependency "railties", "~> 3.0"

  gem.add_development_dependency "bundler", ">= 1.0.0"
  gem.add_development_dependency "rails",   "~> 3.0"
end